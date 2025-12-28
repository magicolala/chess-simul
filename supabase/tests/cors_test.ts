import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const functionDirs = ['join-queue', 'accept-invite', 'leave-queue', 'submit-move'];

for (const dir of functionDirs) {
  Deno.test(`CORS headers test for ${dir}`, async () => {
    const filePath = `../functions/${dir}/index.ts`;
    const content = await Deno.readTextFile(filePath);

    // Test for OPTIONS preflight request handler
    const optionsHandlerMatch = content.match(/if \(req\.method === 'OPTIONS'\)/);
    assert(optionsHandlerMatch, `Missing OPTIONS preflight handler in ${dir}`);

    const responseMatch = content.match(
      /return new Response\((null|'ok'), { headers: corsHeaders }\);/
    );
    assert(responseMatch, `Incorrect OPTIONS response in ${dir}`);

    if (dir !== 'submit-move') {
      assertEquals(
        responseMatch[1],
        'null',
        `OPTIONS handler in ${dir} should return null body`
      );
    }


    if (dir === 'submit-move') {
      const respondFunctionMatch = content.match(
        /function respond\(status: number, body: Record<string, unknown>\) {([\s\S]*?)}/
      );
      assert(respondFunctionMatch, `Missing respond function in ${dir}`);

      const corsInRespondMatch = respondFunctionMatch[1].includes('{ ...corsHeaders,');
      assert(corsInRespondMatch, `respond function in ${dir} is not adding corsHeaders`);
    } else {
        const responsesHaveCors = content.matchAll(/new Response\([\s\S]+?headers: corsHeaders/g);
        const allResponses = content.matchAll(/new Response\(/g);

        // This is a bit of a rough check, but it's better than nothing.
        // It counts all `new Response` and all `new Response` that have `headers: corsHeaders`.
        // The number should be equal.
        assertEquals([...responsesHaveCors].length, [...allResponses].length, `Not all responses in ${dir} have CORS headers`);
    }
  });
}
