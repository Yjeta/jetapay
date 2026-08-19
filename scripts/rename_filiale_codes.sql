-- Renommer les codes des filiales
UPDATE filiales SET code = 'JENG' WHERE code = 'JETA';
UPDATE filiales SET code = 'JH' WHERE code = 'HOLDING';
