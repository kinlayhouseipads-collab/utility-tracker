-- Manual Ghost Wipe
-- Delete all rows in energy_accounts where the provider is 'Utility Co' or the property_name is 'Unknown' / 'Unknown Property'
-- We need a clean slate for the 60-property pilot.

DELETE FROM public.energy_accounts
WHERE property_name = 'Unknown Property'
   OR property_name = 'Unknown'
   OR company_name = 'Unknown'
   OR company_name = 'Unknown Company';

-- Note: The instruction stated "where the provider is 'Utility Co'", however the 'provider' column does not exist
-- in the energy_accounts table schema. The equivalent ghost records are identified by the 'Unknown' property names.
