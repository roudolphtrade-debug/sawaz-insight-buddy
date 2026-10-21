CREATE POLICY "collection_files_team_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'collection-files'
  AND public.has_client_access(NULLIF(split_part(name, '/', 1), '')::uuid)
);
CREATE POLICY "collection_files_team_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'collection-files'
  AND public.can_write_client(NULLIF(split_part(name, '/', 1), '')::uuid)
);
CREATE POLICY "collection_files_team_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'collection-files'
  AND public.can_write_client(NULLIF(split_part(name, '/', 1), '')::uuid)
)
WITH CHECK (
  bucket_id = 'collection-files'
  AND public.can_write_client(NULLIF(split_part(name, '/', 1), '')::uuid)
);
CREATE POLICY "collection_files_owner_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'collection-files'
  AND public.is_owner()
  AND public.has_client_access(NULLIF(split_part(name, '/', 1), '')::uuid)
);
