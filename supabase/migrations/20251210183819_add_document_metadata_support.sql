/*
  # Add Document Metadata Support

  1. Changes
    - Add document_metadata JSONB column to materials table
    - Add indexes for better query performance
    - Add file_category column for easier filtering
    - Add viewer_type column to track preferred viewer

  2. Document Metadata Structure
    - page_count: number of pages (for PDFs, Word docs)
    - sheet_names: array of sheet names (for Excel files)
    - slide_count: number of slides (for presentations)
    - duration: duration in seconds (for videos/audio)
    - dimensions: width and height (for images/videos)
    - has_audio: boolean (for videos)
    - format_version: document format version
    - extraction_date: when metadata was extracted

  3. Security
    - No RLS changes needed - inherits from materials table
*/

-- Add new columns to materials table
DO $$
BEGIN
  -- Add document_metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'document_metadata'
  ) THEN
    ALTER TABLE materials ADD COLUMN document_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add file_category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'file_category'
  ) THEN
    ALTER TABLE materials ADD COLUMN file_category TEXT;
  END IF;

  -- Add viewer_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'viewer_type'
  ) THEN
    ALTER TABLE materials ADD COLUMN viewer_type TEXT;
  END IF;

  -- Add original_filename column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'original_filename'
  ) THEN
    ALTER TABLE materials ADD COLUMN original_filename TEXT;
  END IF;

  -- Add file_extension column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materials' AND column_name = 'file_extension'
  ) THEN
    ALTER TABLE materials ADD COLUMN file_extension TEXT;
  END IF;
END $$;

-- Create index on document_metadata for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_materials_document_metadata
ON materials USING gin (document_metadata);

-- Create index on file_category for filtering
CREATE INDEX IF NOT EXISTS idx_materials_file_category
ON materials (file_category) WHERE file_category IS NOT NULL;

-- Create index on viewer_type for filtering
CREATE INDEX IF NOT EXISTS idx_materials_viewer_type
ON materials (viewer_type) WHERE viewer_type IS NOT NULL;

-- Create index on file_extension for filtering
CREATE INDEX IF NOT EXISTS idx_materials_file_extension
ON materials (file_extension) WHERE file_extension IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN materials.document_metadata IS 'JSONB column storing document-specific metadata like page count, sheet names, duration, etc.';
COMMENT ON COLUMN materials.file_category IS 'Category of file: video, audio, document, image, text, archive, other';
COMMENT ON COLUMN materials.viewer_type IS 'Preferred viewer type: video, audio, pdf, word, excel, powerpoint, image, text, code, generic';
COMMENT ON COLUMN materials.original_filename IS 'Original filename when uploaded';
COMMENT ON COLUMN materials.file_extension IS 'File extension (e.g., pdf, docx, mp4)';

-- Create function to extract metadata from mime_type and update columns
CREATE OR REPLACE FUNCTION update_file_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract file extension from file_path
  NEW.file_extension := LOWER(SUBSTRING(NEW.file_path FROM '\.([^.]+)$'));

  -- Set file category based on mime_type
  IF NEW.mime_type LIKE 'video/%' THEN
    NEW.file_category := 'video';
    NEW.viewer_type := 'video';
  ELSIF NEW.mime_type LIKE 'audio/%' THEN
    NEW.file_category := 'audio';
    NEW.viewer_type := 'audio';
  ELSIF NEW.mime_type LIKE 'image/%' THEN
    NEW.file_category := 'image';
    NEW.viewer_type := 'image';
  ELSIF NEW.mime_type = 'application/pdf' THEN
    NEW.file_category := 'document';
    NEW.viewer_type := 'pdf';
  ELSIF NEW.mime_type IN (
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.oasis.opendocument.text'
  ) THEN
    NEW.file_category := 'document';
    NEW.viewer_type := 'word';
  ELSIF NEW.mime_type IN (
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.oasis.opendocument.spreadsheet'
  ) THEN
    NEW.file_category := 'document';
    NEW.viewer_type := 'excel';
  ELSIF NEW.mime_type IN (
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.oasis.opendocument.presentation'
  ) THEN
    NEW.file_category := 'document';
    NEW.viewer_type := 'powerpoint';
  ELSIF NEW.mime_type LIKE 'text/%' OR NEW.mime_type = 'application/json' THEN
    NEW.file_category := 'text';
    IF NEW.mime_type IN ('text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'text/xml', 'application/xml') THEN
      NEW.viewer_type := 'code';
    ELSE
      NEW.viewer_type := 'text';
    END IF;
  ELSIF NEW.mime_type IN ('application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed') THEN
    NEW.file_category := 'archive';
    NEW.viewer_type := 'generic';
  ELSE
    NEW.file_category := 'other';
    NEW.viewer_type := 'generic';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update metadata on insert/update
DROP TRIGGER IF EXISTS trigger_update_file_metadata ON materials;
CREATE TRIGGER trigger_update_file_metadata
  BEFORE INSERT OR UPDATE OF mime_type, file_path
  ON materials
  FOR EACH ROW
  EXECUTE FUNCTION update_file_metadata();

-- Backfill existing records with metadata
UPDATE materials
SET file_extension = LOWER(SUBSTRING(file_path FROM '\.([^.]+)$'))
WHERE file_extension IS NULL;

-- Backfill file_category and viewer_type for existing records
UPDATE materials
SET
  file_category = CASE
    WHEN mime_type LIKE 'video/%' THEN 'video'
    WHEN mime_type LIKE 'audio/%' THEN 'audio'
    WHEN mime_type LIKE 'image/%' THEN 'image'
    WHEN mime_type = 'application/pdf' THEN 'document'
    WHEN mime_type IN (
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.oasis.opendocument.presentation'
    ) THEN 'document'
    WHEN mime_type LIKE 'text/%' OR mime_type = 'application/json' THEN 'text'
    WHEN mime_type IN ('application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed') THEN 'archive'
    ELSE 'other'
  END,
  viewer_type = CASE
    WHEN mime_type LIKE 'video/%' THEN 'video'
    WHEN mime_type LIKE 'audio/%' THEN 'audio'
    WHEN mime_type LIKE 'image/%' THEN 'image'
    WHEN mime_type = 'application/pdf' THEN 'pdf'
    WHEN mime_type IN ('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.oasis.opendocument.text') THEN 'word'
    WHEN mime_type IN ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/vnd.oasis.opendocument.spreadsheet') THEN 'excel'
    WHEN mime_type IN ('application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint', 'application/vnd.oasis.opendocument.presentation') THEN 'powerpoint'
    WHEN mime_type IN ('text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'text/xml', 'application/xml') THEN 'code'
    WHEN mime_type LIKE 'text/%' THEN 'text'
    ELSE 'generic'
  END
WHERE file_category IS NULL OR viewer_type IS NULL;