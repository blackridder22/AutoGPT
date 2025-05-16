class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.headers = {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        };
    }

    async initializeDatabase() {
        try {
            // Check if the conversations table exists
            const { data: tables } = await this.fetchSupabase(
                'rest/v1/information_schema/tables?select=table_name&table_schema=eq.public',
                { method: 'GET' }
            );

            const hasConversationsTable = tables.some(table => table.table_name === 'conversations');
            const hasMessagesTable = tables.some(table => table.table_name === 'messages');
            const hasFileDataTable = tables.some(table => table.table_name === 'file_data');

            // Create tables if they don't exist
            if (!hasConversationsTable) {
                await this.createConversationsTable();
            }

            if (!hasMessagesTable) {
                await this.createMessagesTable();
            }
            
            if (!hasFileDataTable) {
                await this.createFileDataTable();
            }

            return true;
        } catch (error) {
            console.error('Error initializing Supabase database:', error);
            return false;
        }
    }

    async createConversationsTable() {
        const query = `
        CREATE TABLE IF NOT EXISTS public.conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            user_id TEXT,
            model TEXT,
            settings JSONB DEFAULT '{}'::jsonb,
            cache_control JSONB DEFAULT '{}'::jsonb
        );
        `;

        await this.fetchSupabase('rest/v1/rpc/execute_sql', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }

    async createMessagesTable() {
        const query = `
        CREATE TABLE IF NOT EXISTS public.messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            metadata JSONB DEFAULT '{}'::jsonb,
            annotations JSONB DEFAULT NULL,
            file_id UUID,
            has_file BOOLEAN DEFAULT false
        );
        `;

        await this.fetchSupabase('rest/v1/rpc/execute_sql', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }
    
    async createFileDataTable() {
        const query = `
        CREATE TABLE IF NOT EXISTS public.file_data (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
            conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
            file_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER,
            file_data TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        `;

        await this.fetchSupabase('rest/v1/rpc/execute_sql', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }

    async fetchSupabase(path, options = {}) {
        const url = `${this.url}/${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.headers,
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Supabase error: ${response.status} - ${error}`);
        }

        // If the response is empty, return an empty object
        if (response.status === 204) {
            return {};
        }

        return await response.json();
    }

    async createConversation(title, userId = null, model = null, settings = {}) {
        const newConversation = {
            title,
            user_id: userId,
            model,
            settings,
            cache_control: { enabled: true }
        };

        const { data, error } = await this.fetchSupabase('rest/v1/conversations', {
            method: 'POST',
            body: JSON.stringify(newConversation)
        });

        if (error) throw error;
        
        // Fetch the created conversation to get the full record with ID
        return await this.getConversation(data[0].id);
    }

    async getConversation(id) {
        const { data, error } = await this.fetchSupabase(
            `rest/v1/conversations?id=eq.${id}&select=*`,
            { method: 'GET' }
        );

        if (error) throw error;
        return data[0] || null;
    }

    async listConversations(userId = null, limit = 20) {
        let query = `rest/v1/conversations?select=*&order=updated_at.desc&limit=${limit}`;
        
        if (userId) {
            query += `&user_id=eq.${userId}`;
        }

        const { data, error } = await this.fetchSupabase(query, { method: 'GET' });

        if (error) throw error;
        return data || [];
    }

    async deleteConversation(id) {
        await this.fetchSupabase(
            `rest/v1/conversations?id=eq.${id}`,
            { method: 'DELETE' }
        );
        return true;
    }

    async updateConversation(id, updates) {
        const { data, error } = await this.fetchSupabase(
            `rest/v1/conversations?id=eq.${id}`,
            {
                method: 'PATCH',
                body: JSON.stringify({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (error) throw error;
        return await this.getConversation(id);
    }

    async addMessage(conversationId, role, content, metadata = {}, annotations = null, fileData = null, fileName = null) {
        // Create the base message
        const hasFile = !!fileData && !!fileName;
        
        const newMessage = {
            conversation_id: conversationId,
            role,
            content,
            metadata,
            annotations,
            has_file: hasFile
        };

        // Insert the message
        const { data: messageData, error: messageError } = await this.fetchSupabase(
            'rest/v1/messages',
            {
                method: 'POST',
                body: JSON.stringify(newMessage)
            }
        );

        if (messageError) throw messageError;
        
        // If has file, store file data separately
        if (hasFile && messageData && messageData.length > 0) {
            const messageId = messageData[0].id;
            
            // Get file type from data URL
            const fileType = fileData.split(';')[0].split(':')[1];
            
            const fileEntry = {
                message_id: messageId,
                conversation_id: conversationId,
                file_name: fileName,
                file_type: fileType,
                file_size: fileData.length,
                file_data: fileData
            };
            
            const { error: fileError } = await this.fetchSupabase(
                'rest/v1/file_data',
                {
                    method: 'POST',
                    body: JSON.stringify(fileEntry)
                }
            );
            
            if (fileError) {
                console.error("Error storing file data:", fileError);
            }
            
            // Update the message with file_id
            await this.updateMessage(messageId, {
                file_id: fileEntry.id
            });
        }
        
        // Update the conversation's updated_at field
        await this.updateConversation(conversationId, {});
        
        return messageData ? messageData[0] : null;
    }

    async getMessages(conversationId) {
        // First get all messages for this conversation
        const { data: messages, error } = await this.fetchSupabase(
            `rest/v1/messages?conversation_id=eq.${conversationId}&order=created_at.asc&select=*`,
            { method: 'GET' }
        );

        if (error) throw error;
        
        // If no messages, return empty array
        if (!messages || messages.length === 0) return [];
        
        // Get file data for messages with files
        const messagesWithFiles = messages.filter(msg => msg.has_file);
        
        if (messagesWithFiles.length > 0) {
            // Get all file IDs
            const messageIds = messagesWithFiles.map(msg => msg.id);
            
            // Fetch file data for these messages
            const { data: fileData, error: fileError } = await this.fetchSupabase(
                `rest/v1/file_data?message_id=in.(${messageIds.join(',')})&select=*`,
                { method: 'GET' }
            );
            
            if (!fileError && fileData) {
                // Create a map of message_id to file data
                const fileMap = {};
                fileData.forEach(file => {
                    fileMap[file.message_id] = file;
                });
                
                // Add file data to messages
                messages.forEach(msg => {
                    if (msg.has_file && fileMap[msg.id]) {
                        msg.file_data = fileMap[msg.id].file_data;
                        msg.file_name = fileMap[msg.id].file_name;
                    }
                });
            }
        }
        
        return messages;
    }

    async deleteMessage(id) {
        await this.fetchSupabase(
            `rest/v1/messages?id=eq.${id}`,
            { method: 'DELETE' }
        );
        return true;
    }

    async updateMessage(id, updates) {
        const { data, error } = await this.fetchSupabase(
            `rest/v1/messages?id=eq.${id}`,
            {
                method: 'PATCH',
                body: JSON.stringify(updates)
            }
        );

        if (error) throw error;
        return data[0];
    }
    
    // Methods specifically for handling PDF annotations
    async saveFileAnnotations(conversationId, messageId, annotations) {
        if (!annotations) return false;
        
        return await this.updateMessage(messageId, { annotations });
    }
    
    async getFileAnnotations(conversationId, fileName) {
        // Find messages with file annotations in this conversation
        const { data, error } = await this.fetchSupabase(
            `rest/v1/file_data?conversation_id=eq.${conversationId}&file_name=eq.${fileName}&select=message_id`,
            { method: 'GET' }
        );
        
        if (error || !data || data.length === 0) return null;
        
        // Get the message with annotations
        const messageId = data[0].message_id;
        
        const { data: msgData, error: msgError } = await this.fetchSupabase(
            `rest/v1/messages?id=eq.${messageId}&select=annotations`,
            { method: 'GET' }
        );
        
        if (msgError || !msgData || msgData.length === 0) return null;
        
        return msgData[0].annotations;
    }
}

// Export the class
window.SupabaseClient = SupabaseClient; 