/**
 * Universal document parser for Auto GPT Extension
 * Handles various file types and extracts text to be sent to any AI model
 */

class DocumentParser {
  constructor() {
    this.supportedTypes = {
      'application/pdf': this.extractFromPDF,
      'text/plain': this.extractFromText,
      'text/markdown': this.extractFromText,
      'text/html': this.extractFromHTML,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.extractFromDOCX
    };
  }

  /**
   * Determine if the file type is supported
   */
  isSupported(fileType) {
    return !!this.supportedTypes[fileType];
  }

  /**
   * Main method to extract content from any supported file
   */
  async extractContent(file, fileBase64) {
    if (!file || !this.isSupported(file.type)) {
      return {
        success: false,
        text: `File type ${file.type} is not supported for extraction`,
        metadata: null
      };
    }

    try {
      // Call the appropriate extraction method based on file type
      const result = await this.supportedTypes[file.type].call(this, file, fileBase64);
      return {
        success: true,
        text: result.text,
        metadata: result.metadata || null
      };
    } catch (error) {
      console.error("Error extracting content:", error);
      return {
        success: false,
        text: `Error extracting content: ${error.message}`,
        metadata: null
      };
    }
  }

  /**
   * Extract text from PDF files
   * This uses a simple approach that works in-browser
   */
  async extractFromPDF(file, fileBase64) {
    // If PDF.js is not available, return a simplified message
    if (typeof pdfjsLib === 'undefined') {
      return this.simplePDFExtraction(file, fileBase64);
    }

    try {
      // For demonstration, simple PDF text extraction
      const pdfData = atob(fileBase64);
      const loadingTask = pdfjsLib.getDocument({data: pdfData});
      const pdf = await loadingTask.promise;
      
      let fullText = `[PDF: ${file.name}]\n\n`;
      
      // Get total pages
      const numPages = pdf.numPages;
      const metadata = {
        pageCount: numPages,
        title: file.name,
        fileSize: file.size
      };
      
      // Extract text from each page (limit to first 20 pages for performance)
      const pagesToExtract = Math.min(numPages, 20);
      for (let i = 1; i <= pagesToExtract; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        
        fullText += `[Page ${i}]\n${pageText}\n\n`;
      }
      
      if (numPages > pagesToExtract) {
        fullText += `[Note: ${numPages - pagesToExtract} additional pages were not extracted]`;
      }
      
      return {
        text: fullText,
        metadata
      };
    } catch (error) {
      console.error("PDF extraction error:", error);
      return this.simplePDFExtraction(file, fileBase64);
    }
  }
  
  /**
   * Simple PDF extraction when PDF.js is not available
   */
  simplePDFExtraction(file, fileBase64) {
    return {
      text: `[PDF file: ${file.name}] (${Math.round(file.size / 1024)} KB)\n\nThis PDF contains content that requires specialized parsing. I've analyzed the basic properties but cannot extract the full text content in this environment.`,
      metadata: {
        title: file.name,
        fileSize: file.size,
        note: "PDF content could not be fully extracted"
      }
    };
  }

  /**
   * Extract text from plain text files
   */
  async extractFromText(file, fileBase64) {
    const text = atob(fileBase64);
    return {
      text,
      metadata: {
        title: file.name,
        fileSize: file.size,
        charCount: text.length,
        lineCount: text.split('\n').length
      }
    };
  }

  /**
   * Extract text from HTML files
   */
  async extractFromHTML(file, fileBase64) {
    const htmlText = atob(fileBase64);
    
    // Simple HTML to text conversion
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlText;
    
    // Remove scripts and styles for cleaner text
    const scripts = tempDiv.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());
    
    const text = tempDiv.textContent || tempDiv.innerText || '';
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    return {
      text: cleanText,
      metadata: {
        title: file.name,
        fileSize: file.size,
        isHTML: true
      }
    };
  }

  /**
   * Extract text from DOCX files (simplified)
   */
  async extractFromDOCX(file, fileBase64) {
    // This is a simplified version - in a real implementation
    // you would use a library like mammoth.js
    return {
      text: `[Word Document: ${file.name}] (${Math.round(file.size / 1024)} KB)\n\nThis document requires specialized parsing. I've identified it as a Word document but cannot extract the full content in this environment.`,
      metadata: {
        title: file.name,
        fileSize: file.size,
        isDocx: true
      }
    };
  }
}

// Export the document parser for use in other scripts
window.DocumentParser = DocumentParser; 