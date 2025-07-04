import type { JSONSchema7 } from 'json-schema'

/**
 * workflowSchema
 *
 * JSON Schema for validating GitHub Actions workflow YAML objects.
 * Ensures the workflow has required fields (name, on, jobs) and validates the structure of triggers, jobs, and steps.
 *
 * - The `on` property supports push, pull_request, and workflow_dispatch triggers.
 * - Each job must have a valid name, runs-on, and steps array.
 * - Each step must have a name and either a `uses` or `run` property.
 * - Additional properties are allowed for extensibility.
 *
 * @type {JSONSchema7}
 */
export const workflowSchema: JSONSchema7 = {
  type: 'object',
  required: ['name', 'on', 'jobs'],
  additionalProperties: true,
  properties: {
    name: {
      type: 'string',
      minLength: 1, // Workflow name must be non-empty
    },
    on: {
      type: 'object',
      additionalProperties: true, // Allow custom triggers
      minProperties: 1, // At least one trigger required
      properties: {
        push: {
          type: 'object',
          required: ['branches'],
          properties: {
            branches: {
              oneOf: [
                { type: 'string', minLength: 1 },
                {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'string',
                    minLength: 1,
                  },
                },
              ],
            },
          },
        },
        pull_request: {
          type: 'object',
          required: ['branches'],
          properties: {
            branches: {
              oneOf: [
                { type: 'string', minLength: 1 },
                {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'string',
                    minLength: 1,
                  },
                },
              ],
            },
          },
        },
        workflow_dispatch: {
          type: 'object',
          additionalProperties: true, // Allow custom dispatch options
        },
      },
      // Only allow push, pull_request, or both
      oneOf: [
        {
          required: ['push'],
          not: { required: ['pull_request'] },
        },
        {
          required: ['pull_request'],
          not: { required: ['push'] },
        },
        {
          required: ['push', 'pull_request'],
        },
      ],
    },
    jobs: {
      type: 'object',
      minProperties: 1,
      patternProperties: {
        '^[a-zA-Z][a-zA-Z0-9_-]*$': {
          type: 'object',
          required: ['runs-on', 'steps'],
          additionalProperties: true, // Allow custom job properties
          properties: {
            'name': { type: 'string' },
            'runs-on': {
              oneOf: [
                { type: 'string', minLength: 1 },
                {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'string',
                    minLength: 1,
                  },
                },
              ],
            },
            'steps': {
              type: 'array',
              minItems: 1, // At least one step required
              items: {
                type: 'object',
                required: ['name'],
                additionalProperties: true, // Allow custom step properties
                properties: {
                  'name': { type: 'string', minLength: 1 },
                  'id': { type: 'string' },
                  'if': { type: 'string' },
                  'uses': { type: 'string' },
                  'run': { type: 'string' },
                  'shell': { type: 'string' },
                  'with': {
                    type: 'object',
                    additionalProperties: true,
                  },
                  'env': {
                    type: 'object',
                    additionalProperties: {
                      type: 'string',
                    },
                  },
                  'continue-on-error': { type: 'boolean' },
                },
                // Each step must have either 'uses' or 'run'
                oneOf: [
                  { required: ['uses'] },
                  { required: ['run'] },
                ],
              },
            },
            'env': {
              type: 'object',
              additionalProperties: {
                type: 'string',
              },
            },
          },
        },
      },
    },
  },
}

export const workflowSchema: JSONSchema7 = {
  type: 'object',
  required: ['name', 'on', 'jobs'],
  additionalProperties: true,
  properties: {
    name: {
      type: 'string',
      minLength: 1, // Workflow name must be non-empty
    },
    on: {
      type: 'object',
      additionalProperties: true, // Allow custom triggers
      minProperties: 1, // At least one trigger required
      properties: {
        push: {
          type: 'object',
          required: ['branches'],
          properties: {
            branches: {
              oneOf: [
                { type: 'string', minLength: 1 },
                {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'string',
                    minLength: 1,
                  },
                },
              ],
            },
          },
        },
        pull_request: {
          type: 'object',
          required: ['branches'],
          properties: {
            branches: {
              oneOf: [
                { type: 'string', minLength: 1 },
                {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'string',
                    minLength: 1,
                  },
                },
              ],
            },
          },
        },
        workflow_dispatch: {
          type: 'object',
          additionalProperties: true, // Allow custom dispatch options
        },
      },
      // Only allow push, pull_request, or both
      oneOf: [
        {
          required: ['push'],
          not: { required: ['pull_request'] },
        },
        {
          required: ['pull_request'],
          not: { required: ['push'] },
        },
        {
          required: ['push', 'pull_request'],
        },
      ],
    },
    jobs: {
      type: 'object',
      minProperties: 1,
      patternProperties: {
        '^[a-zA-Z][a-zA-Z0-9_-]*$': {
          type: 'object',
          required: ['runs-on', 'steps'],
          additionalProperties: true, // Allow custom job properties
          properties: {
            'name': { type: 'string' },
            'runs-on': {
              oneOf: [
                { type: 'string', minLength: 1 },
                {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'string',
                    minLength: 1,
                  },
                },
              ],
            },
            'steps': {
              type: 'array',
              minItems: 1, // At least one step required
              items: {
                type: 'object',
                required: ['name'],
                additionalProperties: true, // Allow custom step properties
                properties: {
                  uses: {
                    type: 'string',
                    pattern: '^blackduck-inc/black-duck-security-scan@v$',
                  },
                  with: {
                    type: 'object',
                    anyOf: [
                      { required: ['polaris_server_url'] },
                      { required: ['polaris_access_token'] },
                      { required: ['blackducksca_url'] },
                      { required: ['blackducksca_token'] },
                      { required: ['coverity_url'] },
                      { required: ['coverity_user'] },
                      { required: ['coverity_passphrase'] },
                    ],
                  },
                  env: {
                    type: 'object',
                    anyOf: [
                      { required: ['polaris_server_url'] },
                      { required: ['polaris_access_token'] },
                      { required: ['blackducksca_url'] },
                      { required: ['blackducksca_token'] },
                      { required: ['coverity_url'] },
                      { required: ['coverity_user'] },
                      { required: ['coverity_passphrase'] },
                    ],
                  },
                },
                required: ['uses'],
              },
            },
          },
        },
      },
    },
  },
}

