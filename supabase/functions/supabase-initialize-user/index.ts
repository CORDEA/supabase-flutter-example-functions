import {serve} from 'std/server'
import {createClient, PostgrestError} from '@supabase/supabase-js'

function buildErrorResponse(status: number, error: PostgrestError | string) {
    return new Response(
        JSON.stringify({'error': error}), {
            status: status,
            headers: {'Content-Type': 'application/json'}
        }
    )
}

serve(async (request: Request): Promise<Response> => {
    const client = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        {global: {headers: {Authorization: request.headers.get('Authorization')!}}}
    )
    const {data: {user}} = await client.auth.getUser()
    if (!user) {
        return buildErrorResponse(404, 'User not found.')
    }
    const {data} = await client.from('users').select('name')
    if (data == null) {
        return buildErrorResponse(500, 'Failed to fetch users.')
    }
    const response = await client.from('users').insert({
        'id': user.id,
        'name': 'TODO'
    })
    if (response.error) {
        return buildErrorResponse(500, response.error)
    }
    return new Response(
        JSON.stringify(response.data), {
            headers: {'Content-Type': 'application/json'}
        }
    )
})
