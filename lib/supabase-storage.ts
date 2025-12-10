import { supabase } from './supabase';

const CLIENTS_DATA_BUCKET = 'nla-clients-data';

type UploadIncidentImageParams = {
     clientId: string;
     incidentId: string;
     localUri: string;
     buildingId: string | null;
     apartmentId: string | null;
};

export type IncidentImageRow = {
     id: string;
     storage_bucket: string;
     storage_path: string;
};

export async function uploadIncidentImage(
     params: UploadIncidentImageParams
): Promise<IncidentImageRow | null> {
     const { clientId, incidentId, localUri, buildingId, apartmentId } = params;

     if (!localUri) {
          return null;
     }

     const basePath = `clients/${clientId}/incidents/${incidentId}/images`;

     const extension = localUri.split('.').pop()?.toLowerCase();
     const mimeType =
          extension === 'png'
               ? 'image/png'
               : extension === 'heic' || extension === 'heif'
                    ? 'image/heic'
                    : 'image/jpeg';

     const fileName = `${Date.now()}.${extension || 'jpg'}`;
     const storagePath = `${basePath}/${fileName}`;

     // For React Native / Expo, pass a file-like object with uri/name/type
     const file = {
          uri: localUri,
          name: fileName,
          type: mimeType,
     } as any;

     const { error: uploadError } = await supabase.storage
          .from(CLIENTS_DATA_BUCKET)
          .upload(storagePath, file, {
               cacheControl: '3600',
               upsert: false,
               contentType: mimeType,
          });

     if (uploadError) {
          console.warn('uploadIncidentImage: upload failed', uploadError);
          return null;
     }

     const { data, error } = await supabase
          .from('tblIncidentReportImages')
          .insert({
               storage_bucket: CLIENTS_DATA_BUCKET,
               storage_path: storagePath,
               incident_id: incidentId,
               building_id: buildingId,
               apartment_id: apartmentId,
          })
          .select('id, storage_bucket, storage_path')
          .single();

     if (error || !data) {
          console.warn('uploadIncidentImage: DB insert failed', error);
          return null;
     }

     return data as IncidentImageRow;
}

