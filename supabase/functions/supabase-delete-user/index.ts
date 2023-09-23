import {serve} from 'std/server'
import {createClient, PostgrestError} from '@supabase/supabase-js'

function buildErrorResponse(status: number, error: PostgrestError | Error | string) {
    return new Response(
        JSON.stringify({'error': error}), {
            status: status,
            headers: {'Content-Type': 'application/json'}
        }
    )
}

serve(async (request: Request): Promise<Response> => {
    const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        {global: {headers: {Authorization: request.headers.get('Authorization')!}}}
    )
    const {data: {user}} = await userClient.auth.getUser()
    if (!user) {
        return buildErrorResponse(404, 'User not found.')
    }
    const id = user.id
    let response = await userClient.from('clothes').delete().eq('user_id', id)
    if (response.error) {
        return buildErrorResponse(500, response.error)
    }
    response = await userClient.from('users').delete().eq('id', id)
    if (response.error) {
        return buildErrorResponse(500, response.error)
    }
    const removedFiles = await userClient.storage.from('images').list(id)
    const removedFileNames = removedFiles.data?.map((e) => `${id}/${e.name}`)
    if (removedFileNames) {
        const removed = await userClient.storage.from('images').remove(removedFileNames)
        if (removed.error) {
            return buildErrorResponse(500, removed.error)
        }
    }
    const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const deleted = await adminClient.auth.admin.deleteUser(id)
    if (deleted.error) {
        return buildErrorResponse(500, deleted.error)
    }
    return new Response(
        JSON.stringify(deleted.data), {
            headers: {'Content-Type': 'application/json'}
        }
    )
})
