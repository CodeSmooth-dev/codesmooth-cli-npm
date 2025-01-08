#!/usr/bin/env node
import { Command } from "commander";
import { authorize } from "./services/auth/auth.js";
import { codesmoothCliAuth } from "./services/auth/AuthManager.js";

const program = new Command();

program
  .version("1.0.0")
  .description("Twórz projekty i rozwiązuj zadania z CodeSmooth CLI")
  .option("login", "Zaloguj się do CodeSmooth")
  .action(authorize);

program.parse();
