import { type ChildProcess, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { runFengsoftSuiteE2E } from "../examples/fengsoft-suite-e2e/index.ts";

interface RepoDefinition {
	name: string;
	dir: string;
	projectName: string;
	dependencies: string[];
}

interface ProcessDefinition {
	name: string;
	cwd: string;
	env: Record<string, string>;
	readyUrl?: string;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cacheCoreDir = resolve(scriptDir, "..");
const openSourceDir = resolve(cacheCoreDir, "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";

const repos: RepoDefinition[] = [
	{
		name: "queueflow",
		dir: resolve(openSourceDir, "queueflow"),
		projectName: "fengsoft-suite-queueflow",
		dependencies: ["postgres", "redis"],
	},
	{
		name: "eventflow",
		dir: resolve(openSourceDir, "eventflow"),
		projectName: "fengsoft-suite-eventflow",
		dependencies: ["postgres", "redis"],
	},
	{
		name: "webhook-core",
		dir: resolve(openSourceDir, "webhook-core"),
		projectName: "fengsoft-suite-webhook-core",
		dependencies: ["postgres", "redis"],
	},
	{
		name: "cache-core",
		dir: cacheCoreDir,
		projectName: "fengsoft-suite-cache-core",
		dependencies: ["redis"],
	},
];

function sleep(ms: number) {
	return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function prefixOutput(stream: NodeJS.ReadableStream | null, prefix: string) {
	if (!stream) {
		return;
	}

	const reader = createInterface({ input: stream });
	reader.on("line", (line) => {
		console.log(`${prefix} ${line}`);
	});
}

function parseEnvFile(source: string) {
	const parsed: Record<string, string> = {};

	for (const rawLine of source.split(/\r?\n/u)) {
		const line = rawLine.trim();

		if (!line || line.startsWith("#")) {
			continue;
		}

		const separatorIndex = line.indexOf("=");

		if (separatorIndex <= 0) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1).trim();

		if (!value) {
			continue;
		}

		parsed[key] = value;
	}

	return parsed;
}

async function loadRepoEnv(repoDir: string) {
	const envFile = await readFile(resolve(repoDir, ".env.example"), "utf8");
	return parseEnvFile(envFile);
}

async function runCommand(
	label: string,
	command: string,
	args: string[],
	options: {
		cwd: string;
		env?: Record<string, string>;
	},
) {
	console.log(`[${label}] ${command} ${args.join(" ")}`);

	await new Promise<void>((resolveRun, rejectRun) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: {
				...process.env,
				...options.env,
			},
			stdio: ["ignore", "pipe", "pipe"],
		});

		prefixOutput(child.stdout, `[${label}]`);
		prefixOutput(child.stderr, `[${label}]`);

		child.on("error", rejectRun);
		child.on("exit", (code) => {
			if (code === 0) {
				resolveRun();
				return;
			}

			rejectRun(new Error(`[${label}] exited with code ${code ?? "unknown"}.`));
		});
	});
}

function startProcess(definition: ProcessDefinition) {
	console.log(`[${definition.name}] starting`);
	const child = spawn(pnpmCommand, ["exec", "tsx", "src/index.ts"], {
		cwd: definition.cwd,
		env: {
			...process.env,
			...definition.env,
		},
		stdio: ["ignore", "pipe", "pipe"],
	});

	prefixOutput(child.stdout, `[${definition.name}]`);
	prefixOutput(child.stderr, `[${definition.name}]`);

	return child;
}

async function waitForReady(
	label: string,
	url: string,
	processes: ChildProcess[],
	timeoutMs = 45_000,
) {
	const startedAt = Date.now();

	for (;;) {
		for (const child of processes) {
			if (child.exitCode !== null) {
				throw new Error(
					`[${label}] dependency process exited early with code ${child.exitCode}.`,
				);
			}
		}

		try {
			const response = await fetch(url);

			if (response.ok) {
				console.log(`[${label}] ready at ${url}`);
				return;
			}
		} catch {
			// keep polling until timeout
		}

		if (Date.now() - startedAt >= timeoutMs) {
			throw new Error(`[${label}] timed out waiting for ${url}.`);
		}

		await sleep(500);
	}
}

async function stopProcess(child: ChildProcess, label: string) {
	if (child.exitCode !== null) {
		return;
	}

	child.kill("SIGTERM");

	const exited = await new Promise<boolean>((resolveExit) => {
		const timer = setTimeout(() => {
			resolveExit(false);
		}, 5_000);

		child.once("exit", () => {
			clearTimeout(timer);
			resolveExit(true);
		});
	});

	if (!exited) {
		console.log(`[${label}] forcing shutdown`);
		child.kill("SIGKILL");
	}
}

async function main() {
	const queueflowEnv = await loadRepoEnv(resolve(openSourceDir, "queueflow"));
	const eventflowEnv = await loadRepoEnv(resolve(openSourceDir, "eventflow"));
	const webhookCoreEnv = await loadRepoEnv(
		resolve(openSourceDir, "webhook-core"),
	);
	const cacheCoreEnv = await loadRepoEnv(cacheCoreDir);
	const runningProcesses: Array<{ label: string; child: ChildProcess }> = [];

	try {
		for (const repo of repos) {
			await runCommand(
				`${repo.name}:deps:down`,
				dockerCommand,
				[
					"compose",
					"-f",
					resolve(repo.dir, "docker-compose.yml"),
					"-p",
					repo.projectName,
					"down",
					"-v",
					"--remove-orphans",
				],
				{ cwd: repo.dir },
			).catch(() => undefined);
		}

		for (const repo of repos) {
			await runCommand(
				`${repo.name}:deps:up`,
				dockerCommand,
				[
					"compose",
					"-f",
					resolve(repo.dir, "docker-compose.yml"),
					"-p",
					repo.projectName,
					"up",
					"-d",
					...repo.dependencies,
				],
				{ cwd: repo.dir },
			);
		}

		const webhookApi = startProcess({
			name: "webhook-core-api",
			cwd: resolve(openSourceDir, "webhook-core/apps/api"),
			env: {
				...webhookCoreEnv,
				RETRY_DELAY_SECONDS: "1",
			},
			readyUrl: "http://127.0.0.1:3030/ready",
		});
		runningProcesses.push({ label: "webhook-core-api", child: webhookApi });
		await waitForReady(
			"webhook-core-api",
			"http://127.0.0.1:3030/ready",
			runningProcesses.map((entry) => entry.child),
		);

		const queueflowApi = startProcess({
			name: "queueflow-api",
			cwd: resolve(openSourceDir, "queueflow/apps/api"),
			env: queueflowEnv,
			readyUrl: "http://127.0.0.1:3001/ready",
		});
		runningProcesses.push({ label: "queueflow-api", child: queueflowApi });
		await waitForReady(
			"queueflow-api",
			"http://127.0.0.1:3001/ready",
			runningProcesses.map((entry) => entry.child),
		);

		const queueflowWorker = startProcess({
			name: "queueflow-worker",
			cwd: resolve(openSourceDir, "queueflow/apps/worker"),
			env: {
				...queueflowEnv,
				WEBHOOK_CORE_BASE_URL: "http://127.0.0.1:3030",
				POLL_INTERVAL_MS: "100",
			},
		});
		runningProcesses.push({
			label: "queueflow-worker",
			child: queueflowWorker,
		});
		await sleep(1_000);

		const eventflowApi = startProcess({
			name: "eventflow-api",
			cwd: resolve(openSourceDir, "eventflow/apps/api"),
			env: {
				...eventflowEnv,
				QUEUEFLOW_BASE_URL: "http://127.0.0.1:3001",
			},
			readyUrl: "http://127.0.0.1:3020/ready",
		});
		runningProcesses.push({ label: "eventflow-api", child: eventflowApi });
		await waitForReady(
			"eventflow-api",
			"http://127.0.0.1:3020/ready",
			runningProcesses.map((entry) => entry.child),
		);

		const cacheCoreApi = startProcess({
			name: "cache-core-admin-api",
			cwd: resolve(cacheCoreDir, "apps/admin-api"),
			env: cacheCoreEnv,
			readyUrl: "http://127.0.0.1:3040/ready",
		});
		runningProcesses.push({
			label: "cache-core-admin-api",
			child: cacheCoreApi,
		});
		await waitForReady(
			"cache-core-admin-api",
			"http://127.0.0.1:3040/ready",
			runningProcesses.map((entry) => entry.child),
		);

		await runFengsoftSuiteE2E();
		console.log("[suite] fengsoft suite e2e passed");
	} finally {
		for (const entry of [...runningProcesses].reverse()) {
			await stopProcess(entry.child, entry.label);
		}

		for (const repo of [...repos].reverse()) {
			await runCommand(
				`${repo.name}:deps:down`,
				dockerCommand,
				[
					"compose",
					"-f",
					resolve(repo.dir, "docker-compose.yml"),
					"-p",
					repo.projectName,
					"down",
					"-v",
					"--remove-orphans",
				],
				{ cwd: repo.dir },
			).catch((error) => {
				console.error(`[${repo.name}:deps:down] cleanup failed`);
				console.error(error);
			});
		}
	}
}

main().catch((error) => {
	console.error("[suite] fengsoft suite e2e failed");
	console.error(error);
	process.exitCode = 1;
});
