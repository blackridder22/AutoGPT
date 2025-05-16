# Images & PDFs

> Sending images and PDFs to the OpenRouter API.

OpenRouter supports sending images and PDFs via the API. This guide will show you how to work with both file types using our API.

Both images and PDFs also work in the chat room.

<Tip>
  You can send both PDF and images in the same request.
</Tip>

## Image Inputs

Requests with images, to multimodel models, are available via the `/api/v1/chat/completions` API with a multi-part `messages` parameter. The `image_url` can either be a URL or a base64-encoded image. Note that multiple images can be sent in separate content array entries. The number of images you can send in a single request varies per provider and per model. Due to how the content is parsed, we recommend sending the text prompt first, then the images. If the images must come first, we recommend putting it in the system prompt.

### Using Image URLs

Here's how to send an image using a URL:

<Template
  data={{
  API_KEY_REF,
  MODEL: 'google/gemini-2.0-flash-001'
}}
>
  <CodeGroup>
    ```python
    import requests
    import json

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY_REF}",
        "Content-Type": "application/json"
    }

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "What's in this image?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg"
                    }
                }
            ]
        }
    ]

    payload = {
        "model": "{{MODEL}}",
        "messages": messages
    }

    response = requests.post(url, headers=headers, json=payload)
    print(response.json())
    ```

    ```typescript
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY_REF}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: "What's in this image?",
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg',
                },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    console.log(data);
    ```
  </CodeGroup>
</Template>

### Using Base64 Encoded Images

For locally stored images, you can send them using base64 encoding. Here's how to do it:

<Template
  data={{
  API_KEY_REF,
  MODEL: 'google/gemini-2.0-flash-001'
}}
>
  <CodeGroup>
    ```python
    import requests
    import json
    import base64
    from pathlib import Path

    def encode_image_to_base64(image_path):
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY_REF}",
        "Content-Type": "application/json"
    }

    # Read and encode the image
    image_path = "path/to/your/image.jpg"
    base64_image = encode_image_to_base64(image_path)
    data_url = f"data:image/jpeg;base64,{base64_image}"

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "What's in this image?"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": data_url
                    }
                }
            ]
        }
    ]

    payload = {
        "model": "{{MODEL}}",
        "messages": messages
    }

    response = requests.post(url, headers=headers, json=payload)
    print(response.json())
    ```

    ```typescript
    async function encodeImageToBase64(imagePath: string): Promise<string> {
      const imageBuffer = await fs.promises.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      return `data:image/jpeg;base64,${base64Image}`;
    }

    // Read and encode the image
    const imagePath = 'path/to/your/image.jpg';
    const base64Image = await encodeImageToBase64(imagePath);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY_REF}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: "What's in this image?",
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image,
                },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    console.log(data);
    ```
  </CodeGroup>
</Template>

Supported image content types are:

* `image/png`
* `image/jpeg`
* `image/webp`

## PDF Support

OpenRouter supports PDF processing through the `/api/v1/chat/completions` API. PDFs can be sent as base64-encoded data URLs in the messages array, via the file content type. This feature works on **any** model on OpenRouter.

<Info>
  When a model supports file input natively, the PDF is passed directly to the
  model. When the model does not support file input natively, OpenRouter will
  parse the file and pass the parsed results to the requested model.
</Info>

Note that multiple PDFs can be sent in separate content array entries. The number of PDFs you can send in a single request varies per provider and per model. Due to how the content is parsed, we recommend sending the text prompt first, then the PDF. If the PDF must come first, we recommend putting it in the system prompt.

### Processing PDFs

Here's how to send and process a PDF:

<Template
  data={{
  API_KEY_REF,
  MODEL: 'google/gemma-3-27b-it',
  ENGINE: PDFParserEngine.PDFText,
  DEFAULT_PDF_ENGINE,
}}
>
  <CodeGroup>
    ```python
    import requests
    import json
    import base64
    from pathlib import Path

    def encode_pdf_to_base64(pdf_path):
        with open(pdf_path, "rb") as pdf_file:
            return base64.b64encode(pdf_file.read()).decode('utf-8')

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY_REF}",
        "Content-Type": "application/json"
    }

    # Read and encode the PDF
    pdf_path = "path/to/your/document.pdf"
    base64_pdf = encode_pdf_to_base64(pdf_path)
    data_url = f"data:application/pdf;base64,{base64_pdf}"

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "What are the main points in this document?"
                },
                {
                    "type": "file",
                    "file": {
                        "filename": "document.pdf",
                        "file_data": data_url
                    }
                },
            ]
        }
    ]

    # Optional: Configure PDF processing engine
    # PDF parsing will still work even if the plugin is not explicitly set
    plugins = [
        {
            "id": "file-parser",
            "pdf": {
                "engine": "{{ENGINE}}"  # defaults to "{{DEFAULT_PDF_ENGINE}}". See Pricing below
            }
        }
    ]

    payload = {
        "model": "{{MODEL}}",
        "messages": messages,
        "plugins": plugins
    }

    response = requests.post(url, headers=headers, json=payload)
    print(response.json())
    ```

    ```typescript
    async function encodePDFToBase64(pdfPath: string): Promise<string> {
      const pdfBuffer = await fs.promises.readFile(pdfPath);
      const base64PDF = pdfBuffer.toString('base64');
      return `data:application/pdf;base64,${base64PDF}`;
    }

    // Read and encode the PDF
    const pdfPath = 'path/to/your/document.pdf';
    const base64PDF = await encodePDFToBase64(pdfPath);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY_REF}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: '{{MODEL}}',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What are the main points in this document?',
              },
              {
                type: 'file',
                file: {
                  filename: 'document.pdf',
                  file_data: base64PDF,
                },
              },
            ],
          },
        ],
        // Optional: Configure PDF processing engine
        // PDF parsing will still work even if the plugin is not explicitly set
        plugins: [
          {
            id: 'file-parser',
            pdf: {
              engine: '{{ENGINE}}', // defaults to "{{DEFAULT_PDF_ENGINE}}". See Pricing below
            },
          },
        ],
      }),
    });

    const data = await response.json();
    console.log(data);
    ```
  </CodeGroup>
</Template>

### Pricing

OpenRouter provides several PDF processing engines:

1. <code>"{PDFParserEngine.MistralOCR}"</code>: Best for scanned documents or
   PDFs with images (\${MISTRAL_OCR_COST.toString()} per 1,000 pages).
2. <code>"{PDFParserEngine.PDFText}"</code>: Best for well-structured PDFs with
   clear text content (Free).
3. <code>"{PDFParserEngine.Native}"</code>: Only available for models that
   support file input natively (charged as input tokens).

If you don't explicitly specify an engine, OpenRouter will default first to the model's native file processing capabilities, and if that's not available, we will use the <code>"{DEFAULT_PDF_ENGINE}"</code> engine.

To select an engine, use the plugin configuration:

<Template
  data={{
  API_KEY_REF,
  ENGINE: PDFParserEngine.MistralOCR,
}}
>
  <CodeGroup>
    ```python
    plugins = [
        {
            "id": "file-parser",
            "pdf": {
                "engine": "{{ENGINE}}"
            }
        }
    ]
    ```

    ```typescript
    {
      plugins: [
        {
          id: 'file-parser',
          pdf: {
            engine: '{{ENGINE}}',
          },
        },
      ],
    }
    ```
  </CodeGroup>
</Template>

### Skip Parsing Costs

When you send a PDF to the API, the response may include file annotations in the assistant's message. These annotations contain structured information about the PDF document that was parsed. By sending these annotations back in subsequent requests, you can avoid re-parsing the same PDF document multiple times, which saves both processing time and costs.

Here's how to reuse file annotations:

<Template
  data={{
  API_KEY_REF,
  MODEL: 'google/gemma-3-27b-it'
}}
>
  <CodeGroup>
    ```python
    import requests
    import json
    import base64
    from pathlib import Path

    # First, encode and send the PDF
    def encode_pdf_to_base64(pdf_path):
        with open(pdf_path, "rb") as pdf_file:
            return base64.b64encode(pdf_file.read()).decode('utf-8')

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {API_KEY_REF}",
        "Content-Type": "application/json"
    }

    # Read and encode the PDF
    pdf_path = "path/to/your/document.pdf"
    base64_pdf = encode_pdf_to_base64(pdf_path)
    data_url = f"data:application/pdf;base64,{base64_pdf}"

    # Initial request with the PDF
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "What are the main points in this document?"
                },
                {
                    "type": "file",
                    "file": {
                        "filename": "document.pdf",
                        "file_data": data_url
                    }
                },
            ]
        }
    ]

    payload = {
        "model": "{{MODEL}}",
        "messages": messages
    }

    response = requests.post(url, headers=headers, json=payload)
    response_data = response.json()

    # Store the annotations from the response
    file_annotations = None
    if response_data.get("choices") and len(response_data["choices"]) > 0:
        if "annotations" in response_data["choices"][0]["message"]:
            file_annotations = response_data["choices"][0]["message"]["annotations"]

    # Follow-up request using the annotations (without sending the PDF again)
    if file_annotations:
        follow_up_messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "What are the main points in this document?"
                    },
                    {
                        "type": "file",
                        "file": {
                            "filename": "document.pdf",
                            "file_data": data_url
                        }
                    }
                ]
            },
            {
                "role": "assistant",
                "content": "The document contains information about...",
                "annotations": file_annotations
            },
            {
                "role": "user",
                "content": "Can you elaborate on the second point?"
            }
        ]

        follow_up_payload = {
            "model": "{{MODEL}}",
            "messages": follow_up_messages
        }

        follow_up_response = requests.post(url, headers=headers, json=follow_up_payload)
        print(follow_up_response.json())
    ```

    ```typescript
    import fs from 'fs/promises';
    import { fetch } from 'node-fetch';

    async function encodePDFToBase64(pdfPath: string): Promise<string> {
      const pdfBuffer = await fs.readFile(pdfPath);
      const base64PDF = pdfBuffer.toString('base64');
      return `data:application/pdf;base64,${base64PDF}`;
    }

    // Initial request with the PDF
    async function processDocument() {
      // Read and encode the PDF
      const pdfPath = 'path/to/your/document.pdf';
      const base64PDF = await encodePDFToBase64(pdfPath);

      const initialResponse = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${API_KEY_REF}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: '{{MODEL}}',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'What are the main points in this document?',
                  },
                  {
                    type: 'file',
                    file: {
                      filename: 'document.pdf',
                      file_data: base64PDF,
                    },
                  },
                ],
              },
            ],
          }),
        },
      );

      const initialData = await initialResponse.json();

      // Store the annotations from the response
      let fileAnnotations = null;
      if (initialData.choices && initialData.choices.length > 0) {
        if (initialData.choices[0].message.annotations) {
          fileAnnotations = initialData.choices[0].message.annotations;
        }
      }

      // Follow-up request using the annotations (without sending the PDF again)
      if (fileAnnotations) {
        const followUpResponse = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${API_KEY_REF}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: '{{MODEL}}',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'What are the main points in this document?',
                    },
                    {
                      type: 'file',
                      file: {
                        filename: 'document.pdf',
                        file_data: base64PDF,
                      },
                    },
                  ],
                },
                {
                  role: 'assistant',
                  content: 'The document contains information about...',
                  annotations: fileAnnotations,
                },
                {
                  role: 'user',
                  content: 'Can you elaborate on the second point?',
                },
              ],
            }),
          },
        );

        const followUpData = await followUpResponse.json();
        console.log(followUpData);
      }
    }

    processDocument();
    ```
  </CodeGroup>
</Template>

<Info>
  When you include the file annotations from a previous response in your
  subsequent requests, OpenRouter will use this pre-parsed information instead
  of re-parsing the PDF, which saves processing time and costs. This is
  especially beneficial for large documents or when using the `mistral-ocr`
  engine which incurs additional costs.
</Info>

### Response Format

The API will return a response in the following format:

```json
{
  "id": "gen-1234567890",
  "provider": "DeepInfra",
  "model": "google/gemma-3-27b-it",
  "object": "chat.completion",
  "created": 1234567890,
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "The document discusses..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 1000,
    "completion_tokens": 100,
    "total_tokens": 1100
  }
}
```