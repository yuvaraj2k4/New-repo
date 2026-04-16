import io
from fastapi import HTTPException

def extract_text_from_upload(content: bytes, filename: str) -> str:
    """
    Extracts plain text from uploaded file bytes based on the file extension.
    Supported formats: .txt, .doc, .docx
    """
    ext = filename.lower().split('.')[-1] if '.' in filename else ""
    
    if ext == "txt":
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            # Fallback for ISO-8859-1 or other common Windows encodings if utf-8 fails
            return content.decode("iso-8859-1", errors="replace")
            
    elif ext == "docx":
        try:
            from docx import Document as DocxDocument
            doc_stream = io.BytesIO(content)
            doc = DocxDocument(doc_stream)
            text = "\n".join(paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip())
            return text
        except Exception as e:
            raise ValueError(f"Failed to parse document: {str(e)}")
            
    elif ext == "doc":
        raise ValueError("Legacy .doc format is not supported. Please convert your file to .docx format.")
    else:
        raise ValueError(f"Unsupported file format: .{ext}")
