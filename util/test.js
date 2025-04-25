#!/usr/bin/env node
import { log } from "console";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs/promises";

dotenv.config();

const API_KEY = process.env.ROOTDATA_API_KEY;
const API_URL = "https://api.rootdata.com/open/hot_index";

if (!API_KEY) {
  console.error("Error: Set ROOTDATA_API_KEY environment variable");
  process.exit(1);
}

async function testAPI() {
  try {
    console.log("Making API request...");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
        language: "en",
      },
      body: JSON.stringify({ days: 1 }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Save the entire response to a JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rootdata-response-${timestamp}.json`;
    
    await fs.writeFile(filename, JSON.stringify(data, null, 2));
    console.log(`\n💾 Full response saved to: ${filename}`);

    // The response is an object with 'data' array and 'result' code
    console.log("Response result code:", data.result);

    const projects = data.data;
    console.log({projects});
    console.log(`\n✅ API Test Successful!`);
    console.log(`Total projects: ${projects.length}`);
    console.log(`\nTop 5 projects:`);

    projects.slice(0, 5).forEach((p, i) => {
      console.log(`${i + 1}. ${p.project_name}`);
      console.log(`   Rank: ${p.rank}`);
      console.log(`   Token: ${p.token_symbol || "N/A"}`);
      console.log(`   Evaluation: ${p.eval}`);
      console.log(`   Tags: ${p.tags.join(", ")}`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ API Test Failed:", error.message);
    process.exit(1);
  }
}

console.log("Testing Rootdata API...");
testAPI();