export class APIMError extends Error {
    type: string;
    param: string;
    code: string;

    constructor(message: string, type: string, param: string, code: string) {
        super(message);
        this.name = 'APIMError';
        this.type = type;
        this.param = param;
        this.code = code;
    }
}

export const makeAPIMRequest = async (
    url: string, accessToken: string, method: string, body: any
) => {
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ accessToken }`
        },
        method,
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        return new Response(res.body, {
            status: 500,
            headers: res.headers,
        });
    } else if (res.status === 400) {
        const json = await res.json();
        const { message, type, param, code } = json;
        if (code == 'content_length_exceeded') {
            return new Response(res.body, {
                status: 400,
                headers: res.headers,
            });
        }
        throw new APIMError(message, type, param, code);
    } else if (res.status !== 200) {
        console.error(
            `APIM API returned an error ${
            res.status
            }: ${await res.text()}`,
        );
        throw new Error(`APIM API returned an error: ${res.text()} (${res.status})`);
    }

    const json = await res.json();

    // const string = JSON.stringify(json.message);
    return json
}
