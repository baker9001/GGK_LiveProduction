/*
  # Create license actions table

  1. New Tables
    - `license_actions`
      - `id` (uuid, primary key)
      - `license_id` (uuid, foreign key to licenses)
      - `action_type` (text: EXPAND, EXTEND, RENEW)
      - `change_quantity` (integer, optional)
      - `new_end_date` (date, optional)
      - `notes` (text, optional)
      - `created_at` (timestamp)

  2. Foreign Keys
    - license_actions.license_id references licenses(id)

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE license_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id),
  action_type text NOT NULL CHECK (action_type IN ('EXPAND', 'EXTEND', 'RENEW')),
  change_quantity integer,
  new_end_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE license_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on license_actions"
  ON license_actions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_license_actions_license_id ON license_actions(license_id);
CREATE INDEX idx_license_actions_action_type ON license_actions(action_type);
CREATE INDEX idx_license_actions_created_at ON license_actions(created_at);