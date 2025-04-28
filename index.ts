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

interface ComprehensiveQueryArgs {
  query: string;
  analysisType?:
    | "project"
    | "investor"
    | "ecosystem"
    | "trends"
    | "fundraising"
    | "comprehensive";
  timeframe?: string;
  depth?: "basic" | "detailed" | "full";
  includeRelated?: boolean;
}

interface InvestigateEntityArgs {
  entityName: string;
  entityType?: "project" | "investor" | "person" | "auto";
  investigationScope?: "basic" | "funding" | "social" | "ecosystem" | "all";
}

interface TrackTrendsArgs {
  category:
    | "hot_projects"
    | "funding"
    | "job_changes"
    | "new_tokens"
    | "ecosystem"
    | "all";
  timeRange?: "1d" | "7d" | "30d" | "3m";
  filterBy?: {
    ecosystem?: string;
    tags?: string;
    minFunding?: number;
  };
}

interface CompareEntitiesArgs {
  entities: string[];
  compareType?: "metrics" | "funding" | "ecosystem" | "social" | "all";
}

interface CrossFunctionalAnalysisResult {
  primaryData: any;
  relatedProjects?: any[];
  investors?: any[];
  ecosystem?: any;
  trends?: any;
  fundraising?: any;
  people?: any[];
  tokens?: any[];
  summary?: string;
}

// Type guards
function isValidComprehensiveQueryArgs(
  args: unknown
): args is ComprehensiveQueryArgs {
  const candidate = args as ComprehensiveQueryArgs;
  return (
    typeof args === "object" &&
    args !== null &&
    typeof candidate.query === "string" &&
    (candidate.analysisType === undefined ||
      [
        "project",
        "investor",
        "ecosystem",
        "trends",
        "fundraising",
        "comprehensive",
      ].includes(candidate.analysisType)) &&
    (candidate.timeframe === undefined ||
      typeof candidate.timeframe === "string") &&
    (candidate.depth === undefined ||
      ["basic", "detailed", "full"].includes(candidate.depth)) &&
    (candidate.includeRelated === undefined ||
      typeof candidate.includeRelated === "boolean")
  );
}

function isValidInvestigateEntityArgs(
  args: unknown
): args is InvestigateEntityArgs {
  const candidate = args as InvestigateEntityArgs;
  return (
    typeof args === "object" &&
    args !== null &&
    typeof candidate.entityName === "string" &&
    (candidate.entityType === undefined ||
      ["project", "investor", "person", "auto"].includes(
        candidate.entityType
      )) &&
    (candidate.investigationScope === undefined ||
      ["basic", "funding", "social", "ecosystem", "all"].includes(
        candidate.investigationScope
      ))
  );
}

function isValidTrackTrendsArgs(args: unknown): args is TrackTrendsArgs {
  const candidate = args as TrackTrendsArgs;
  return (
    typeof args === "object" &&
    args !== null &&
    [
      "hot_projects",
      "funding",
      "job_changes",
      "new_tokens",
      "ecosystem",
      "all",
    ].includes(candidate.category) &&
    (candidate.timeRange === undefined ||
      ["1d", "7d", "30d", "3m"].includes(candidate.timeRange)) &&
    (candidate.filterBy === undefined ||
      (typeof candidate.filterBy === "object" &&
        (candidate.filterBy.ecosystem === undefined ||
          typeof candidate.filterBy.ecosystem === "string") &&
        (candidate.filterBy.tags === undefined ||
          typeof candidate.filterBy.tags === "string") &&
        (candidate.filterBy.minFunding === undefined ||
          typeof candidate.filterBy.minFunding === "number")))
  );
}

function isValidCompareEntitiesArgs(
  args: unknown
): args is CompareEntitiesArgs {
  const candidate = args as CompareEntitiesArgs;
  return (
    typeof args === "object" &&
    args !== null &&
    Array.isArray(candidate.entities) &&
    candidate.entities.every((entity) => typeof entity === "string") &&
    (candidate.compareType === undefined ||
      ["metrics", "funding", "ecosystem", "social", "all"].includes(
        candidate.compareType
      ))
  );
}

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
          name: "analyzeComprehensive",
          description:
            "Comprehensive analysis combining multiple RootData endpoints for a holistic view",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Natural language query about crypto projects, investors, or trends",
              },
              analysisType: {
                type: "string",
                description: "Type of analysis to perform",
                enum: [
                  "project",
                  "investor",
                  "ecosystem",
                  "trends",
                  "fundraising",
                  "comprehensive",
                ],
              },
              timeframe: {
                type: "string",
                description:
                  "Time period for analysis (e.g., '7d', '30d', '2024-01')",
              },
              depth: {
                type: "string",
                description: "Level of detail required",
                enum: ["basic", "detailed", "full"],
              },
              includeRelated: {
                type: "boolean",
                description: "Include related entities in the analysis",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "investigateEntity",
          description:
            "Deep dive into a specific entity with all related information",
          inputSchema: {
            type: "object",
            properties: {
              entityName: {
                type: "string",
                description: "Name of the project, investor, or person",
              },
              entityType: {
                type: "string",
                description: "Type of entity",
                enum: ["project", "investor", "person", "auto"],
              },
              investigationScope: {
                type: "string",
                description: "What aspects to investigate",
                enum: ["basic", "funding", "social", "ecosystem", "all"],
              },
            },
            required: ["entityName"],
          },
        },
        {
          name: "trackTrends",
          description:
            "Track market trends across projects, funding, and social metrics",
          inputSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Category to track",
                enum: [
                  "hot_projects",
                  "funding",
                  "job_changes",
                  "new_tokens",
                  "ecosystem",
                  "all",
                ],
              },
              timeRange: {
                type: "string",
                description: "Time range for trends",
                enum: ["1d", "7d", "30d", "3m"],
              },
              filterBy: {
                type: "object",
                properties: {
                  ecosystem: { type: "string" },
                  tags: { type: "string" },
                  minFunding: { type: "number" },
                },
              },
            },
            required: ["category"],
          },
        },
        {
          name: "compareEntities",
          description: "Compare multiple projects or investors side by side",
          inputSchema: {
            type: "object",
            properties: {
              entities: {
                type: "array",
                items: { type: "string" },
                description: "List of entity names to compare",
              },
              compareType: {
                type: "string",
                description: "Type of comparison",
                enum: ["metrics", "funding", "ecosystem", "social", "all"],
              },
            },
            required: ["entities"],
          },
        },
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

  private async handleAnalyzeComprehensive(args: ComprehensiveQueryArgs) {
    try {
      const result: CrossFunctionalAnalysisResult = {
        primaryData: null,
      };

      // First, search for the main entity
      const searchResult = await this.makeApiRequest("ser_inv", {
        query: args.query,
        precise_x_search: false,
      });

      if (!searchResult.data || searchResult.data.length === 0) {
        throw new Error(`No results found for query: ${args.query}`);
      }

      const mainEntity = searchResult.data[0];
      let analysisPromises = [];

      // Based on entity type and analysis requirements, fetch relevant data
      if (mainEntity.type === 1) {
        // Project
        // Get detailed project info
        analysisPromises.push(
          this.makeApiRequest("get_item", {
            project_id: mainEntity.id,
            include_team: args.depth !== "basic",
            include_investors: args.depth !== "basic",
          }).then((res) => {
            result.primaryData = res.data;
          })
        );

        // Get funding rounds if requested
        if (
          args.analysisType === "comprehensive" ||
          args.analysisType === "fundraising"
        ) {
          analysisPromises.push(
            this.makeApiRequest("get_fac", {
              project_id: mainEntity.id,
              page: 1,
              page_size: 10,
            }).then((res) => {
              result.fundraising = res.data;
            })
          );
        }

        // Get ecosystem data if requested
        if (args.includeRelated) {
          analysisPromises.push(
            this.makeApiRequest("ecosystem_map", {}).then(
              async (ecosystemData) => {
                // Find relevant ecosystem and get related projects
                if (result.primaryData && result.primaryData.ecosystem) {
                  const ecosystemId = ecosystemData.data.find(
                    (eco: { ecosystem_name: string; ecosystem_id: number }) =>
                      eco.ecosystem_name === result.primaryData.ecosystem[0]
                  )?.ecosystem_id;

                  if (ecosystemId) {
                    const relatedProjects = await this.makeApiRequest(
                      "projects_by_ecosystems",
                      {
                        ecosystem_ids: ecosystemId.toString(),
                      }
                    );
                    result.relatedProjects = relatedProjects.data;
                  }
                }
              }
            )
          );
        }

        // Get hot index if analyzing trends
        if (
          args.analysisType === "trends" ||
          args.analysisType === "comprehensive"
        ) {
          analysisPromises.push(
            this.makeApiRequest("hot_index", { days: 7 }).then((res) => {
              const projectRank = res.data.find(
                (p: { project_id: number }) => p.project_id === mainEntity.id
              );
              if (projectRank) {
                result.trends = { hotIndex: projectRank };
              }
            })
          );
        }
      } else if (mainEntity.type === 2) {
        // VC/Investor
        // Get detailed VC info
        analysisPromises.push(
          this.makeApiRequest("get_org", {
            org_id: mainEntity.id,
            include_team: args.depth !== "basic",
            include_investments: true,
          }).then((res) => {
            result.primaryData = res.data;
          })
        );

        // Get recent funding activities
        if (
          args.analysisType === "comprehensive" ||
          args.analysisType === "investor"
        ) {
          analysisPromises.push(
            this.makeApiRequest("get_invest", {
              page: 1,
              page_size: 10,
            }).then((res) => {
              const investorData = res.data.items.find(
                (inv: { invest_id: number }) => inv.invest_id === mainEntity.id
              );
              if (investorData) {
                result.investors = [investorData];
              }
            })
          );
        }
      } else if (mainEntity.type === 3) {
        // Person
        // Get detailed person info
        analysisPromises.push(
          this.makeApiRequest("get_people", {
            people_id: mainEntity.id,
          }).then((res) => {
            result.primaryData = res.data;
          })
        );

        // Get job changes if available
        if (args.includeRelated) {
          analysisPromises.push(
            this.makeApiRequest("job_changes", {
              recent_joinees: true,
              recent_resignations: true,
            }).then((res) => {
              result.people = res.data;
            })
          );
        }
      }

      // Get market trends if comprehensive analysis
      if (args.analysisType === "comprehensive") {
        analysisPromises.push(
          this.makeApiRequest("new_tokens", {}).then((res) => {
            result.tokens = res.data;
          })
        );
      }

      await Promise.all(analysisPromises);

      // Generate summary
      result.summary = this.generateSummary(result, args);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleInvestigateEntity(args: InvestigateEntityArgs) {
    try {
      // First identify the entity
      const searchResult = await this.makeApiRequest("ser_inv", {
        query: args.entityName,
      });

      if (!searchResult.data || searchResult.data.length === 0) {
        throw new Error(`Entity not found: ${args.entityName}`);
      }

      const entity = searchResult.data[0];
      const investigation: any = {
        entityInfo: entity,
        details: null,
        relatedData: {},
      };

      // Determine entity type and fetch appropriate data
      if (entity.type === 1) {
        // Project
        investigation.details = await this.makeApiRequest("get_item", {
          project_id: entity.id,
          include_team: true,
          include_investors: true,
        });

        if (
          args.investigationScope === "funding" ||
          args.investigationScope === "all"
        ) {
          investigation.relatedData.funding = await this.makeApiRequest(
            "get_fac",
            {
              project_id: entity.id,
            }
          );
        }

        if (
          args.investigationScope === "social" ||
          args.investigationScope === "all"
        ) {
          const xHotProjects = await this.makeApiRequest("hot_project_on_x", {
            heat: true,
            influence: true,
            followers: true,
          });

          investigation.relatedData.socialMetrics = {
            heat: xHotProjects.data.heat?.find(
              (p: { project_id: number }) => p.project_id === entity.id
            ),
            influence: xHotProjects.data.influence?.find(
              (p: { project_id: number }) => p.project_id === entity.id
            ),
            followers: xHotProjects.data.followers?.find(
              (p: { project_id: number }) => p.project_id === entity.id
            ),
          };
        }

        if (
          args.investigationScope === "ecosystem" ||
          args.investigationScope === "all"
        ) {
          const ecosystemMap = await this.makeApiRequest("ecosystem_map", {});
          const projectEcosystems = investigation.details.data?.ecosystem || [];

          if (projectEcosystems.length > 0) {
            const ecosystemIds = ecosystemMap.data
              .filter((eco: { ecosystem_name: string; ecosystem_id: number }) =>
                projectEcosystems.includes(eco.ecosystem_name)
              )
              .map(
                (eco: { ecosystem_name: string; ecosystem_id: number }) =>
                  eco.ecosystem_id
              );

            if (ecosystemIds.length > 0) {
              investigation.relatedData.relatedProjects =
                await this.makeApiRequest("projects_by_ecosystems", {
                  ecosystem_ids: ecosystemIds.join(","),
                });
            }
          }
        }
      } else if (entity.type === 2) {
        // VC
        investigation.details = await this.makeApiRequest("get_org", {
          org_id: entity.id,
          include_team: true,
          include_investments: true,
        });

        if (
          args.investigationScope === "funding" ||
          args.investigationScope === "all"
        ) {
          investigation.relatedData.investorAnalysis =
            await this.makeApiRequest("get_invest", {
              page: 1,
              page_size: 10,
            });
        }
      } else if (entity.type === 3) {
        // Person
        investigation.details = await this.makeApiRequest("get_people", {
          people_id: entity.id,
        });

        if (
          args.investigationScope === "social" ||
          args.investigationScope === "all"
        ) {
          const xPopularFigures = await this.makeApiRequest(
            "leading_figures_on_crypto_x",
            {
              rank_type: "heat",
              page: 1,
              page_size: 100,
            }
          );

          investigation.relatedData.ranking = xPopularFigures.data.items?.find(
            (p: { people_id: number }) => p.people_id === entity.id
          );
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(investigation, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleTrackTrends(args: TrackTrendsArgs) {
    try {
      const trends: any = {};

      if (args.category === "hot_projects" || args.category === "all") {
        trends.hotProjects = await this.makeApiRequest("hot_index", {
          days: args.timeRange === "1d" ? 1 : 7,
        });
      }

      if (args.category === "funding" || args.category === "all") {
        const endDate = new Date();
        const startDate = new Date();

        switch (args.timeRange) {
          case "1d":
            startDate.setDate(startDate.getDate() - 1);
            break;
          case "7d":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "30d":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case "3m":
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          default:
            // Default to 7 days if timeRange is undefined
            startDate.setDate(startDate.getDate() - 7);
            break;
        }

        trends.funding = await this.makeApiRequest("get_fac", {
          start_time: startDate.toISOString().slice(0, 7),
          end_time: endDate.toISOString().slice(0, 7),
          min_amount: args.filterBy?.minFunding,
        });
      }

      if (args.category === "job_changes" || args.category === "all") {
        trends.jobChanges = await this.makeApiRequest("job_changes", {
          recent_joinees: true,
          recent_resignations: true,
        });
      }

      if (args.category === "new_tokens" || args.category === "all") {
        trends.newTokens = await this.makeApiRequest("new_tokens", {});
      }

      if (args.category === "ecosystem" || args.category === "all") {
        trends.ecosystemMap = await this.makeApiRequest("ecosystem_map", {});

        if (args.filterBy?.ecosystem) {
          const ecosystemName = args.filterBy.ecosystem;
          const ecosystemId = trends.ecosystemMap.data.find(
            (eco: { ecosystem_name: string; ecosystem_id: number }) =>
              eco.ecosystem_name.toLowerCase() === ecosystemName.toLowerCase()
          )?.ecosystem_id;

          if (ecosystemId) {
            trends.ecosystemProjects = await this.makeApiRequest(
              "projects_by_ecosystems",
              {
                ecosystem_ids: ecosystemId.toString(),
              }
            );
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(trends, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async handleCompareEntities(args: CompareEntitiesArgs) {
    try {
      const comparison: any = {
        entities: [],
        metrics: {},
        summary: "",
      };

      // Search for all entities
      for (const entityName of args.entities) {
        const searchResult = await this.makeApiRequest("ser_inv", {
          query: entityName,
        });

        if (searchResult.data && searchResult.data.length > 0) {
          const entity = searchResult.data[0];
          let entityData: any = {
            basicInfo: entity,
            details: null,
          };

          // Fetch details based on entity type
          if (entity.type === 1) {
            // Project
            entityData.details = await this.makeApiRequest("get_item", {
              project_id: entity.id,
              include_team: true,
              include_investors: true,
            });

            if (
              args.compareType === "funding" ||
              args.compareType === "all" ||
              !args.compareType
            ) {
              entityData.funding = await this.makeApiRequest("get_fac", {
                project_id: entity.id,
              });
            }

            if (
              args.compareType === "social" ||
              args.compareType === "all" ||
              !args.compareType
            ) {
              const hotProjects = await this.makeApiRequest(
                "hot_project_on_x",
                {
                  heat: true,
                  influence: true,
                  followers: true,
                }
              );

              entityData.socialMetrics = {
                heat: hotProjects.data.heat?.find(
                  (p: { project_id: number }) => p.project_id === entity.id
                ),
                influence: hotProjects.data.influence?.find(
                  (p: { project_id: number }) => p.project_id === entity.id
                ),
                followers: hotProjects.data.followers?.find(
                  (p: { project_id: number }) => p.project_id === entity.id
                ),
              };
            }
          } else if (entity.type === 2) {
            // VC
            entityData.details = await this.makeApiRequest("get_org", {
              org_id: entity.id,
              include_team: true,
              include_investments: true,
            });
          } else if (entity.type === 3) {
            // Person
            entityData.details = await this.makeApiRequest("get_people", {
              people_id: entity.id,
            });
          }

          comparison.entities.push(entityData);
        }
      }

      // Generate comparison metrics
      comparison.metrics = this.generateComparisonMetrics(
        comparison.entities,
        args.compareType || "all"
      );
      comparison.summary = this.generateComparisonSummary(comparison);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(comparison, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private generateSummary(
    result: CrossFunctionalAnalysisResult,
    args: ComprehensiveQueryArgs
  ): string {
    let summary = `Analysis for "${args.query}":\n\n`;

    if (result.primaryData) {
      const entityType = result.primaryData.project_name
        ? "Project"
        : result.primaryData.org_name
        ? "VC/Organization"
        : result.primaryData.people_name
        ? "Person"
        : "Entity";

      summary += `${entityType}: ${
        result.primaryData.project_name ||
        result.primaryData.org_name ||
        result.primaryData.people_name
      }\n`;

      if (result.primaryData.total_funding) {
        summary += `Total Funding: ${(
          result.primaryData.total_funding / 1e6
        ).toFixed(2)}M\n`;
      }

      if (result.primaryData.establishment_date) {
        summary += `Established: ${result.primaryData.establishment_date}\n`;
      }
    }

    if (result.trends?.hotIndex) {
      summary += `\nHot Index Rank: #${result.trends.hotIndex.rank} (Score: ${result.trends.hotIndex.eval})\n`;
    }

    if (result.relatedProjects) {
      summary += `\nRelated Projects: ${result.relatedProjects.length} projects in the same ecosystem\n`;
    }

    if (result.fundraising?.items?.length) {
      summary += `\nFundraising Rounds: ${result.fundraising.items.length} rounds found\n`;
    }

    return summary;
  }

  private generateComparisonMetrics(entities: any[], compareType: string): any {
    const metrics: any = {};

    entities.forEach((entity) => {
      const name = entity.basicInfo.name;
      metrics[name] = {};

      if (entity.basicInfo.type === 1) {
        // Project
        if (entity.details?.data) {
          metrics[name].funding = entity.details.data.total_funding;
          metrics[name].establishedDate =
            entity.details.data.establishment_date;
          metrics[name].ecosystem = entity.details.data.ecosystem;
          metrics[name].tags = entity.details.data.tags;
        }

        if (entity.socialMetrics) {
          metrics[name].heat = entity.socialMetrics.heat?.score;
          metrics[name].influence = entity.socialMetrics.influence?.score;
          metrics[name].followers = entity.socialMetrics.followers?.score;
        }
      } else if (entity.basicInfo.type === 2) {
        // VC
        if (entity.details?.data) {
          metrics[name].investmentCount =
            entity.details.data.investments?.length;
          metrics[name].establishedDate =
            entity.details.data.establishment_date;
          metrics[name].category = entity.details.data.category;
        }
      }
    });

    return metrics;
  }

  private generateComparisonSummary(comparison: any): string {
    let summary = "Comparison Summary:\n\n";

    comparison.entities.forEach((entity: any, index: number) => {
      summary += `${index + 1}. ${entity.basicInfo.name} (${
        entity.basicInfo.type === 1
          ? "Project"
          : entity.basicInfo.type === 2
          ? "VC"
          : "Person"
      })\n`;
    });

    // Add key metric comparisons
    const fundingComparison = Object.entries(comparison.metrics)
      .filter(([_, metrics]: [string, any]) => metrics.funding)
      .sort((a: any, b: any) => b[1].funding - a[1].funding);

    if (fundingComparison.length > 0) {
      summary += "\nFunding Comparison:\n";
      fundingComparison.forEach(([name, metrics]: [string, any]) => {
        summary += `${name}: ${(metrics.funding / 1e6).toFixed(2)}M\n`;
      });
    }

    return summary;
  }

  private setupCallToolHandler(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments;

      console.error(`Calling tool: ${toolName}`);

      switch (toolName) {
        case "analyzeComprehensive":
          if (!isValidComprehensiveQueryArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid comprehensive query arguments"
            );
          }
          return this.handleAnalyzeComprehensive(args);
        case "investigateEntity":
          if (!isValidInvestigateEntityArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid investigate entity arguments"
            );
          }
          return this.handleInvestigateEntity(args);
        case "trackTrends":
          if (!isValidTrackTrendsArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid track trends arguments"
            );
          }
          return this.handleTrackTrends(args);
        case "compareEntities":
          if (!isValidCompareEntitiesArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid compare entities arguments"
            );
          }
          return this.handleCompareEntities(args);
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
