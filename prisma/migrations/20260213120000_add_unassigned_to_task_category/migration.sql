-- Add UNASSIGNED to TaskCategory for scheduler tasks without phase/category (legacy cotization items).
alter type "TaskCategory" add value 'UNASSIGNED';
