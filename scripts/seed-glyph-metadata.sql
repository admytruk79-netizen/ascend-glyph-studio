insert into glyph_family(id,display_order) values
('earth',1),('water',2),('fire',3),('air',4),('spirit',5)
on conflict(id) do update set display_order=excluded.display_order;

-- Geometry remains absent until exact SVG verification. Metadata can safely exist first.
