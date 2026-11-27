import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const entries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/writing' }),
  schema: z.object({ title: z.string(), date: z.coerce.date(), type: z.string().default('Essay'), language: z.string().default('EN'), description: z.string(), tags: z.array(z.string()).default([]), concepts: z.array(z.string()).default([]), directions: z.record(z.string(), z.number().min(0).max(1.6)).optional(), draft: z.boolean().default(false) })
});
const photographs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/photography' }),
  schema: z.object({ title: z.string(), date: z.coerce.date(), location: z.string().optional(), language: z.string().default('EN'), description: z.string(), tags: z.array(z.string()).default([]), concepts: z.array(z.string()).default([]), directions: z.record(z.string(), z.number().min(0).max(1.6)).optional(), images: z.array(z.object({src:z.string(), alt:z.string()})).default([]), draft: z.boolean().default(false) })
});

const exhibitions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/exhibitions' }),
  schema: z.object({
    title: z.string(), visitedOn: z.coerce.date().optional(), dateLabel: z.string().optional(),
    engagement: z.enum(['visited','researched','planned']).default('visited'), researchOn: z.coerce.date().optional(), plannedOn: z.coerce.date().optional(), recordedOn: z.coerce.date().optional(), researchSources: z.string().optional(),
    region: z.string(), location: z.string(), kind: z.string(),
    artists: z.array(z.string()).default([]),
    concepts: z.array(z.string()).default([]),
    directions: z.record(z.string(), z.number().min(0).max(1.6)).optional(),
    institution: z.string().optional(),
    relatedInstitutions: z.array(z.string()).default([]),
    exhibitionStart: z.coerce.date().optional(),
    exhibitionEnd: z.coerce.date().optional(),
    verification: z.enum(['recorded','needs-review']).default('needs-review')
  })
});
const people = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/people' }),
  schema: z.object({ name: z.string(), kind: z.string().default('artist'), reading: z.string().optional(), sortName: z.string().optional(), nativeName: z.string().optional(), alternativeNames: z.array(z.string()).default([]), linkedInstitutions: z.array(z.string()).default([]) })
});
const institutions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/institutions' }),
  schema: z.object({ name: z.string(), city: z.string().optional(), longitude: z.number().optional(), latitude: z.number().optional(), locationType: z.enum(['site','city','variable']).optional(), address: z.string().optional(), addressStatus: z.enum(['verified','needs-review']).optional(), addressSource: z.string().url().optional(), venueName: z.string().optional(), venueAddress: z.string().optional(), venueStatus: z.enum(['user-supplied','reference']).optional(), associatedProject: z.string().optional(), linkedPeople: z.array(z.string()).default([]), linkedExhibitions: z.array(z.string()).default([]), linkedConcepts: z.array(z.string()).default([]) })
});
const concepts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/data/concepts' }),
  schema: z.object({ title: z.string() })
});
export const collections = { entries, photographs, exhibitions, people, institutions, concepts };
