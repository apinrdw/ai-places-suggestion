import { google } from '@ai-sdk/google';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

const locationSchema = z.object({
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

const model = google('gemini-2.5-flash');

export async function POST(request: Request) {
  // TODO: should be dynamic based on the user information eg: user id, ip address, etc.
  const identifier = 'api/extract-location';
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { text } = await request.json();

  if (!text) {
    return Response.json({ error: 'Text is required' }, { status: 400 });
  }

  const generateResult = await generateText({
    model,
    system:
      'You are a helpful assistant that can search the web to find places to visit.',
    prompt: `Find 5 popular places in ${text}`,
    tools: {
      google_search: google.tools.googleSearch({}),
    },
  });

  const result = await generateObject({
    model,
    schema: z.array(locationSchema),
    prompt: `Find the exact location coordinates (latitude and longitude) for each of these places: ${generateResult.text}. Provide accurate coordinates for each location.`,
  });

  return Response.json({ locations: result.object });
}
