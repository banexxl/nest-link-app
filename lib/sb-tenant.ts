// lib/tenant-links.ts
import { SupabaseClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/supabase'; // if you use generated types

// helper to roughly validate UUID (optional)
const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export type TenantClientBuildingInfo = {
     tenantId: string;
     clientId: string;
     buildingId: string;
     apartmentId: string;
};

export const getClientIdFromTenantBuilding = async (
     supabase: SupabaseClient, // SupabaseClient<Database> if you have types
     tenantId: string
): Promise<{
     success: boolean;
     data?: TenantClientBuildingInfo;
     error?: string;
}> => {
     if (!tenantId || !isUUID(tenantId)) {
          return { success: false, error: 'Invalid tenant ID' };
     }
     console.log('Fetching client/building/apartment for tenant ID:', tenantId);
     try {
          // 1) tenant -> apartment_id
          const { data: tenant, error: tenantError } = await supabase
               .from('tblTenants') // TABLES.TENANTS in your server code
               .select('apartment_id')
               .eq('id', tenantId)
               .single();

          if (tenantError) {
               console.log('Error fetching tenant:', tenantError.message);
               return { success: false, error: tenantError.message };
          }

          if (!tenant?.apartment_id) {
               return { success: false, error: 'Tenant has no apartment assigned' };
          }

          const apartmentId = tenant.apartment_id as string;

          // 2) apartment -> building_id
          const { data: apartment, error: apartmentError } = await supabase
               .from('tblApartments') // TABLES.APARTMENTS
               .select('building_id')
               .eq('id', apartmentId)
               .single();

          if (apartmentError) {
               console.log('Error fetching apartment:', apartmentError.message);
               return { success: false, error: apartmentError.message };
          }

          if (!apartment?.building_id) {
               return { success: false, error: 'Apartment has no building assigned' };
          }

          const buildingId = apartment.building_id as string;

          // 3) building -> client_id
          const { data: building, error: buildingError } = await supabase
               .from('tblBuildings') // TABLES.BUILDINGS
               .select('client_id')
               .eq('id', buildingId)
               .single();

          if (buildingError) {
               console.log('Error fetching building:', buildingError.message);
               return { success: false, error: buildingError.message };
          }

          if (!building?.client_id) {
               return { success: false, error: 'Building has no client assigned' };
          }

          const clientId = building.client_id as string;

          return {
               success: true,
               data: { tenantId, clientId, buildingId, apartmentId },
          };
     } catch (error: any) {
          console.log('Error in getClientIdFromTenantBuilding (client):', error);
          return {
               success: false,
               error: error?.message || 'Unexpected error',
          };
     }
};
/**
 * Resolve tenant + building + client from auth.users.id
 */
export const getClientIdFromAuthUser = async (
     supabase: SupabaseClient,
     authUserId: string
): Promise<{
     success: boolean;
     data?: TenantClientBuildingInfo;
     error?: string;
}> => {
     if (!authUserId || !isUUID(authUserId)) {
          return { success: false, error: 'Invalid auth user ID' };
     }

     try {
          // 1) auth user -> tenant row
          // ⚠️ assumes tblTenants has a column auth_user_id referencing auth.users.id
          const { data: tenant, error: tenantError } = await supabase
               .from('tblTenants')
               .select('id, apartment_id')
               .eq('auth_user_id', authUserId)
               .maybeSingle(); // no throw if 0 rows

          if (tenantError) {
               console.log('Error fetching tenant:', tenantError.message);
               return { success: false, error: tenantError.message };
          }

          if (!tenant) {
               return { success: false, error: 'No tenant linked to this account.' };
          }

          if (!tenant.apartment_id) {
               return { success: false, error: 'Tenant has no apartment assigned.' };
          }

          const tenantId = tenant.id as string;
          const apartmentId = tenant.apartment_id as string;

          // 2) apartment -> building_id
          const { data: apartment, error: apartmentError } = await supabase
               .from('tblApartments')
               .select('building_id')
               .eq('id', apartmentId)
               .maybeSingle();

          if (apartmentError) {
               console.log('Error fetching apartment:', apartmentError.message);
               return { success: false, error: apartmentError.message };
          }

          if (!apartment?.building_id) {
               return { success: false, error: 'Apartment has no building assigned.' };
          }

          const buildingId = apartment.building_id as string;

          // 3) building -> client_id
          const { data: building, error: buildingError } = await supabase
               .from('tblBuildings')
               .select('client_id')
               .eq('id', buildingId)
               .maybeSingle();

          if (buildingError) {
               console.log('Error fetching building:', buildingError.message);
               return { success: false, error: buildingError.message };
          }

          if (!building?.client_id) {
               return { success: false, error: 'Building has no client assigned.' };
          }

          const clientId = building.client_id as string;

          return {
               success: true,
               data: { tenantId, apartmentId, buildingId, clientId },
          };
     } catch (error: any) {
          console.log('Error in getClientIdFromAuthUser:', error);
          return {
               success: false,
               error: error?.message || 'Unexpected error',
          };
     }
};
