-- Seed default categories
INSERT INTO public.categories (name, slug, description, icon, color) VALUES
  ('General', 'general', 'General discussions and topics', 'MessageSquare', '#6366f1'),
  ('Technology', 'technology', 'Tech news, programming, and gadgets', 'Cpu', '#10b981'),
  ('Gaming', 'gaming', 'Video games, esports, and gaming culture', 'Gamepad2', '#f59e0b'),
  ('Art & Design', 'art-design', 'Creative works, design tips, and inspiration', 'Palette', '#ec4899'),
  ('Music', 'music', 'Music discussion, recommendations, and production', 'Music', '#8b5cf6'),
  ('Movies & TV', 'movies-tv', 'Film and television discussions', 'Film', '#ef4444'),
  ('Help & Support', 'help-support', 'Get help from the community', 'HelpCircle', '#06b6d4'),
  ('Announcements', 'announcements', 'Official forum announcements', 'Megaphone', '#f97316')
ON CONFLICT (slug) DO NOTHING;
