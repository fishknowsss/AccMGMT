UPDATE accounts
SET
  renewal_date = '2026-06-01',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
