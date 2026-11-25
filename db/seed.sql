INSERT INTO customers (full_name, email)
VALUES
  ('Ada Lovelace', 'ada@example.com'),
  ('Grace Hopper', 'grace@example.com'),
  ('Linus Torvalds', 'linus@example.com');

INSERT INTO events (name, venue, starts_at, capacity, seats_remaining, status)
VALUES
  (
    'Backend Systems Summit',
    'Civic Hall',
    '2027-02-15T09:00:00Z',
    100,
    96,
    'on_sale'
  ),
  (
    'Intimate Jazz & Code Night',
    'Velvet Room',
    '2027-02-20T19:30:00Z',
    5,
    2,
    'on_sale'
  ),
  (
    'Sold Out Indie Showcase',
    'Basement Stage',
    '2027-02-25T20:00:00Z',
    2,
    0,
    'sold_out'
  ),
  (
    'Cancelled Winter Workshop',
    'North Wing Studio',
    '2027-03-01T10:00:00Z',
    50,
    50,
    'cancelled'
  );

INSERT INTO bookings (event_id, customer_id, quantity, status)
VALUES
  (1, 1, 4, 'confirmed'),
  (2, 2, 3, 'confirmed'),
  (3, 1, 2, 'confirmed'),
  (4, 3, 5, 'cancelled');