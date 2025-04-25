#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const CONFIG = {
  API_KEY: process.env.ROOTDATA_API_KEY!,
  API_BASE_URL: "https://api.rootdata.com/open",
  DEFAULT_LANGUAGE: "en",
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// Validate environment variables
if (!process.env.ROOTDATA_API_KEY) {
  throw new Error("ROOTDATA_API_KEY environment variable is required");
}

// Types
interface BaseResponse {
  result: number;
  message?: string;
  data: any;
}

interface SearchArgs {
  query: string;
  preciseXSearch?: boolean;
}

interface GetProjectArgs {
  projectId: number;
  includeTeam?: boolean;
  includeInvestors?: boolean;
}

interface GetOrgArgs {
  orgId: number;
  includeTeam?: boolean;
  includeInvestments?: boolean;
}

interface GetPeopleArgs {
  peopleId: number;
}

interface GetInvestorsArgs {
  page?: number;
  pageSize?: number;
}

interface GetFundingRoundsArgs {
  page?: number;
  pageSize?: number;
  startTime?: string;
  endTime?: string;
  minAmount?: number;
  maxAmount?: number;
  projectId?: number;
}

interface SyncUpdateArgs {
  beginTime: number;
  endTime?: number;
}

interface HotProjectsArgs {
  days: number;
}

interface XHotProjectsArgs {
  heat?: boolean;
  influence?: boolean;
  followers?: boolean;
}

interface XPopularFiguresArgs {
  page?: number;
  pageSize?: number;
  rankType: "heat" | "influence";
}

interface JobChangesArgs {
  recentJoinees?: boolean;
  recentResignations?: boolean;
}

interface ProjectsByEcosystemArgs {
  ecosystemIds: string;
}

interface ProjectsByTagsArgs {
  tagIds: string;
}

// Type guards
function isValidSearchArgs(args: unknown): args is SearchArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "query" in args &&
    typeof (args as any).query === "string"
  );
}

function isValidGetProjectArgs(args: unknown): args is GetProjectArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "projectId" in args &&
    typeof (args as any).projectId === "number"
  );
}

function isValidGetOrgArgs(args: unknown): args is GetOrgArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "orgId" in args &&
    typeof (args as any).orgId === "number"
  );
}

function isValidGetPeopleArgs(args: unknown): args is GetPeopleArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "peopleId" in args &&
    typeof (args as any).peopleId === "number"
  );
}

function isValidGetInvestorsArgs(args: unknown): args is GetInvestorsArgs {
  return typeof args === "object" && args !== null;
}

function isValidGetFundingRoundsArgs(
  args: unknown
): args is GetFundingRoundsArgs {
  return typeof args === "object" && args !== null;
}

function isValidSyncUpdateArgs(args: unknown): args is SyncUpdateArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "beginTime" in args &&
    typeof (args as any).beginTime === "number"
  );
}

function isValidHotProjectsArgs(args: unknown): args is HotProjectsArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "days" in args &&
    typeof (args as any).days === "number"
  );
}

function isValidXHotProjectsArgs(args: unknown): args is XHotProjectsArgs {
  return typeof args === "object" && args !== null;
}

function isValidXPopularFiguresArgs(
  args: unknown
): args is XPopularFiguresArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "rankType" in args &&
    ((args as any).rankType === "heat" ||
      (args as any).rankType === "influence")
  );
}

function isValidJobChangesArgs(args: unknown): args is JobChangesArgs {
  return typeof args === "object" && args !== null;
}

function isValidProjectsByEcosystemArgs(
  args: unknown
): args is ProjectsByEcosystemArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "ecosystemIds" in args &&
    typeof (args as any).ecosystemIds === "string"
  );
}

function isValidProjectsByTagsArgs(args: unknown): args is ProjectsByTagsArgs {
  return (
    typeof args === "object" &&
    args !== null &&
    "tagIds" in args &&
    typeof (args as any).tagIds === "string"
  );
}

class RootdataServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "rootdata", version: "0.2.0" },
      { capabilities: { tools: {} } }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: Error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async makeApiRequest(
    endpoint: string,
    data: any = {}
  ): Promise<BaseResponse> {
    if (!CONFIG.API_KEY) {
      throw new Error("API key is not configured");
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CONFIG.API_KEY,
        language: CONFIG.DEFAULT_LANGUAGE,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        `Rootdata API returned status: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    if (result.result !== 200) {
      throw new Error(result.message || `API Error: ${result.result}`);
    }

    return result;
  }

  private setupHandlers(): void {
    this.setupListToolsHandler();
    this.setupCallToolHandler();
  }

  private setupListToolsHandler(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "searchEntities",
          description: "Search for projects, VCs, or people by keywords",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search keywords",
              },
              preciseXSearch: {
                type: "boolean",
                description: "Search by X handle (@...)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "getProject",
          description: "Get detailed project information",
          inputSchema: {
            type: "object",
            properties: {
              projectId: {
                type: "number",
                description: "Project ID",
              },
              includeTeam: {
                type: "boolean",
                description: "Include team members",
              },
              includeInvestors: {
                type: "boolean",
                description: "Include investors",
              },
            },
            required: ["projectId"],
          },
        },
        {
          name: "getOrg",
          description: "Get detailed VC/organization information",
          inputSchema: {
            type: "object",
            properties: {
              orgId: {
                type: "number",
                description: "Organization ID",
              },
              includeTeam: {
                type: "boolean",
                description: "Include team members",
              },
              includeInvestments: {
                type: "boolean",
                description: "Include investments",
              },
            },
            required: ["orgId"],
          },
        },
        {
          name: "getPeople",
          description: "Get detailed information about a person (Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              peopleId: {
                type: "number",
                description: "Person ID",
              },
            },
            required: ["peopleId"],
          },
        },
        {
          name: "getInvestors",
          description: "Get investor information in batches (Plus/Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              page: {
                type: "number",
                description: "Page number (default: 1)",
              },
              pageSize: {
                type: "number",
                description: "Items per page (default: 10, max: 100)",
              },
            },
          },
        },
        {
          name: "getFundingRounds",
          description: "Get fundraising rounds information (Plus/Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              page: {
                type: "number",
                description: "Page number",
              },
              pageSize: {
                type: "number",
                description: "Items per page (max: 200)",
              },
              startTime: {
                type: "string",
                description: "Start date (yyyy-MM)",
              },
              endTime: {
                type: "string",
                description: "End date (yyyy-MM)",
              },
              minAmount: {
                type: "number",
                description: "Minimum funding amount (USD)",
              },
              maxAmount: {
                type: "number",
                description: "Maximum funding amount (USD)",
              },
              projectId: {
                type: "number",
                description: "Project ID",
              },
            },
          },
        },
        {
          name: "syncUpdate",
          description: "Get projects updated within a time range (Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              beginTime: {
                type: "number",
                description: "Start timestamp",
              },
              endTime: {
                type: "number",
                description: "End timestamp",
              },
            },
            required: ["beginTime"],
          },
        },
        {
          name: "getHotProjects",
          description: "Get top 100 hot crypto projects (Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              days: {
                type: "number",
                description: "Time period (1 or 7 days)",
                enum: [1, 7],
              },
            },
            required: ["days"],
          },
        },
        {
          name: "getXHotProjects",
          description: "Get X platform hot projects rankings (Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              heat: {
                type: "boolean",
                description: "Get heat ranking",
              },
              influence: {
                type: "boolean",
                description: "Get influence ranking",
              },
              followers: {
                type: "boolean",
                description: "Get followers ranking",
              },
            },
          },
        },
        {
          name: "getXPopularFigures",
          description: "Get X platform popular figures (Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              page: {
                type: "number",
                description: "Page number",
              },
              pageSize: {
                type: "number",
                description: "Items per page (max: 100)",
              },
              rankType: {
                type: "string",
                description: "Ranking type",
                enum: ["heat", "influence"],
              },
            },
            required: ["rankType"],
          },
        },
        {
          name: "getJobChanges",
          description: "Get job position changes (Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              recentJoinees: {
                type: "boolean",
                description: "Get recent job joiners",
              },
              recentResignations: {
                type: "boolean",
                description: "Get recent resignations",
              },
            },
          },
        },
        {
          name: "getNewTokens",
          description:
            "Get newly issued tokens in the past 3 months (Pro only)",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "getEcosystemMap",
          description: "Get ecosystem map list (Pro only)",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "getTagMap",
          description: "Get tag map list (Pro only)",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "getProjectsByEcosystem",
          description: "Get projects by ecosystem IDs (Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              ecosystemIds: {
                type: "string",
                description: "Comma-separated ecosystem IDs",
              },
            },
            required: ["ecosystemIds"],
          },
        },
        {
          name: "getProjectsByTags",
          description: "Get projects by tag IDs (Pro only)",
          inputSchema: {
            type: "object",
            properties: {
              tagIds: {
                type: "string",
                description: "Comma-separated tag IDs",
              },
            },
            required: ["tagIds"],
          },
        },
      ],
    }));
  }

  private setupCallToolHandler(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments;

      console.error(`Calling tool: ${toolName}`);

      switch (toolName) {
        case "searchEntities":
          if (!isValidSearchArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid search arguments"
            );
          }
          return this.handleSearch(args);

        case "getProject":
          if (!isValidGetProjectArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid project arguments"
            );
          }
          return this.handleGetProject(args);

        case "getOrg":
          if (!isValidGetOrgArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid organization arguments"
            );
          }
          return this.handleGetOrg(args);

        case "getPeople":
          if (!isValidGetPeopleArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid people arguments"
            );
          }
          return this.handleGetPeople(args);

        case "getInvestors":
          if (!isValidGetInvestorsArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid investors arguments"
            );
          }
          return this.handleGetInvestors(args);

        case "getFundingRounds":
          if (!isValidGetFundingRoundsArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid funding rounds arguments"
            );
          }
          return this.handleGetFundingRounds(args);

        case "syncUpdate":
          if (!isValidSyncUpdateArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid sync update arguments"
            );
          }
          return this.handleSyncUpdate(args);

        case "getHotProjects":
          if (!isValidHotProjectsArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid hot projects arguments"
            );
          }
          return this.handleGetHotProjects(args);

        case "getXHotProjects":
          if (!isValidXHotProjectsArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid X hot projects arguments"
            );
          }
          return this.handleGetXHotProjects(args);

        case "getXPopularFigures":
          if (!isValidXPopularFiguresArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid X popular figures arguments"
            );
          }
          return this.handleGetXPopularFigures(args);

        case "getJobChanges":
          if (!isValidJobChangesArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid job changes arguments"
            );
          }
          return this.handleGetJobChanges(args);

        case "getNewTokens":
          return this.handleGetNewTokens();

        case "getEcosystemMap":
          return this.handleGetEcosystemMap();

        case "getTagMap":
          return this.handleGetTagMap();

        case "getProjectsByEcosystem":
          if (!isValidProjectsByEcosystemArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid ecosystem arguments"
            );
          }
          return this.handleGetProjectsByEcosystem(args);

        case "getProjectsByTags":
          if (!isValidProjectsByTagsArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid tags arguments"
            );
          }
          return this.handleGetProjectsByTags(args);

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${toolName}`
          );
      }
    });
  }

  // Handler methods for each endpoint
  private async handleSearch(args: SearchArgs) {
    try {
      const response = await this.makeApiRequest("ser_inv", {
        query: args.query,
        precise_x_search: args.preciseXSearch,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetProject(args: GetProjectArgs) {
    try {
      const response = await this.makeApiRequest("get_item", {
        project_id: args.projectId,
        include_team: args.includeTeam,
        include_investors: args.includeInvestors,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetOrg(args: GetOrgArgs) {
    try {
      const response = await this.makeApiRequest("get_org", {
        org_id: args.orgId,
        include_team: args.includeTeam,
        include_investments: args.includeInvestments,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetPeople(args: GetPeopleArgs) {
    try {
      const response = await this.makeApiRequest("get_people", {
        people_id: args.peopleId,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetInvestors(args: GetInvestorsArgs) {
    try {
      const response = await this.makeApiRequest("get_invest", {
        page: args.page || 1,
        page_size: Math.min(
          args.pageSize || CONFIG.DEFAULT_PAGE_SIZE,
          CONFIG.MAX_PAGE_SIZE
        ),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetFundingRounds(args: GetFundingRoundsArgs) {
    try {
      const response = await this.makeApiRequest("get_fac", {
        page: args.page || 1,
        page_size: Math.min(args.pageSize || CONFIG.DEFAULT_PAGE_SIZE, 200),
        start_time: args.startTime,
        end_time: args.endTime,
        min_amount: args.minAmount,
        max_amount: args.maxAmount,
        project_id: args.projectId,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleSyncUpdate(args: SyncUpdateArgs) {
    try {
      const response = await this.makeApiRequest("ser_change", {
        begin_time: args.beginTime,
        end_time: args.endTime,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetHotProjects(args: HotProjectsArgs) {
    try {
      const response = await this.makeApiRequest("hot_index", {
        days: args.days,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetXHotProjects(args: XHotProjectsArgs) {
    try {
      const response = await this.makeApiRequest("hot_project_on_x", {
        heat: args.heat !== false,
        influence: args.influence !== false,
        followers: args.followers !== false,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetXPopularFigures(args: XPopularFiguresArgs) {
    try {
      const response = await this.makeApiRequest(
        "leading_figures_on_crypto_x",
        {
          page: args.page || 1,
          page_size: Math.min(
            args.pageSize || CONFIG.DEFAULT_PAGE_SIZE,
            CONFIG.MAX_PAGE_SIZE
          ),
          rank_type: args.rankType,
        }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetJobChanges(args: JobChangesArgs) {
    try {
      const response = await this.makeApiRequest("job_changes", {
        recent_joinees: args.recentJoinees !== false,
        recent_resignations: args.recentResignations !== false,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetNewTokens() {
    try {
      const response = await this.makeApiRequest("new_tokens", {});

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetEcosystemMap() {
    try {
      const response = await this.makeApiRequest("ecosystem_map", {});

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetTagMap() {
    try {
      const response = await this.makeApiRequest("tag_map", {});

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetProjectsByEcosystem(args: ProjectsByEcosystemArgs) {
    try {
      const response = await this.makeApiRequest("projects_by_ecosystems", {
        ecosystem_ids: args.ecosystemIds,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleGetProjectsByTags(args: ProjectsByTagsArgs) {
    try {
      const response = await this.makeApiRequest("projects_by_tags", {
        tag_ids: args.tagIds,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    console.error("API Error:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Rootdata MCP server running on stdio");
  }
}

// Bootstrap the server
async function main() {
  try {
    const server = new RootdataServer();
    await server.run();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
