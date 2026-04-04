import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import siteConfig from "./site.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");
const repoDir = path.resolve(appDir, "..", "..");
const docsDir = path.join(appDir, "src", "content", "docs");
const packagesDocsDir = path.join(docsDir, "packages");
const runtimesDocsDir = path.join(docsDir, "runtimes");
const examplesDocsDir = path.join(docsDir, "examples");
const projectDocsDir = path.join(docsDir, "project");

const repositoryFullName =
  process.env.SITE_REPOSITORY ??
  process.env.GITHUB_REPOSITORY ??
  siteConfig.defaultRepository;
const repositoryBranch =
  process.env.GITHUB_REF_NAME ?? process.env.SITE_BRANCH ?? "main";

async function main() {
  const [packages, runtimes, examples, readme, docsMap, license] =
    await Promise.all([
      collectWorkspacePackages(),
      collectRuntimeApps(),
      collectExamples(),
      readRepoFile("README.md"),
      readRepoFile("docs/README.md"),
      readRepoFile("LICENSE"),
    ]);

  await Promise.all([
    resetDir(packagesDocsDir),
    resetDir(runtimesDocsDir),
    resetDir(examplesDocsDir),
    resetDir(projectDocsDir),
  ]);

  await writeHomePage(packages, runtimes, examples);
  await writeProjectDocs(readme, docsMap, license);
  await writePackageDocs(packages);
  await writeRuntimeDocs(runtimes);
  await writeExampleDocs(examples);
}

async function collectWorkspacePackages() {
  return collectWorkspaces("packages", (workspacePath) => {
    const slug = path.posix
      .relative("packages", workspacePath)
      .replaceAll("/", "-");
    return {
      slug,
      docs: siteConfig.packages[slug] ?? null,
    };
  });
}

async function collectRuntimeApps() {
  return collectWorkspaces("apps", (workspacePath) => {
    const relativePath = path.posix.relative("apps", workspacePath);

    if (relativePath === "docs") {
      return null;
    }

    return {
      slug: relativePath.replaceAll("/", "-"),
      docs: siteConfig.runtimes[relativePath.replaceAll("/", "-")] ?? null,
    };
  });
}

async function collectExamples() {
  const examplesRoot = path.join(repoDir, "examples");
  const entries = await fs.readdir(examplesRoot, { withFileTypes: true });
  const examples = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const slug = entry.name;
    const examplePath = path.posix.join("examples", slug);
    examples.push({
      slug,
      workspacePath: examplePath,
      title: siteConfig.examples[slug]?.title ?? titleFromSlug(slug),
      description:
        siteConfig.examples[slug]?.description ??
        `Reference example inside the ${siteConfig.title} repository.`,
      docs: siteConfig.examples[slug] ?? null,
      sourceFiles: inferSourceFiles(
        examplePath,
        siteConfig.examples[slug]?.sourceHints ?? ["README.md", "index.ts"],
      ),
    });
  }

  return examples.sort((left, right) => left.slug.localeCompare(right.slug));
}

async function collectWorkspaces(baseDir, decorate) {
  const packageJsonPaths = await findPackageJsonPaths(
    path.join(repoDir, baseDir),
  );
  const workspaces = [];

  for (const packageJsonPath of packageJsonPaths) {
    const workspacePath = path.posix.dirname(
      path.posix.relative(repoDir, packageJsonPath),
    );
    const decoration = decorate(workspacePath);

    if (!decoration) {
      continue;
    }

    const packageJson = await readJson(packageJsonPath);
    const internalDependencies = Object.keys(packageJson.dependencies ?? {})
      .filter((dependency) => dependency.startsWith("@fengsoft/"))
      .sort();
    const externalDependencies = Object.keys(packageJson.dependencies ?? {})
      .filter((dependency) => !dependency.startsWith("@fengsoft/"))
      .sort();
    workspaces.push({
      slug: decoration.slug,
      title: packageJson.name,
      description:
        decoration.docs?.description ??
        `Reference workspace inside the ${siteConfig.title} monorepo.`,
      docs: decoration.docs,
      packageJson,
      workspacePath,
      internalDependencies,
      externalDependencies,
      sourceFiles: inferSourceFiles(
        workspacePath,
        decoration.docs?.sourceHints ?? ["src/index.ts", "src/schema.ts"],
      ),
    });
  }

  return workspaces.sort((left, right) => left.slug.localeCompare(right.slug));
}

async function findPackageJsonPaths(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const packageJsonPaths = [];

  for (const entry of entries) {
    if (entry.name === "node_modules") {
      continue;
    }

    const resolvedPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      packageJsonPaths.push(...(await findPackageJsonPaths(resolvedPath)));
      continue;
    }

    if (entry.isFile() && entry.name === "package.json") {
      packageJsonPaths.push(resolvedPath);
    }
  }

  return packageJsonPaths;
}

function inferSourceFiles(workspacePath, hints) {
  return [...new Set(hints)]
    .map((candidate) => path.posix.join(workspacePath, candidate))
    .filter((candidate) => existsSync(path.join(repoDir, candidate)));
}

async function writeHomePage(packages, runtimes, examples) {
  const homeRoute = "/";
  const body = [
    "---",
    `title: ${yamlString(siteConfig.title)}`,
    `description: ${yamlString(siteConfig.description)}`,
    "---",
    "",
    siteConfig.home.intro,
    "",
    "## What is in the repository",
    "",
    `- ${packages.length} workspace packages`,
    `- ${runtimes.length} runtime applications`,
    `- ${examples.length} runnable example integrations`,
    "",
    "## Why teams adopt QueueFlow",
    "",
    ...siteConfig.home.whyAdopt.map((item) => `- ${item}`),
    "",
    "## Start here",
    "",
    "<ul>",
    ...siteConfig.sidebar.guides.map(
      (item) =>
        `  <li><a href="${relativeDocLink(homeRoute, `/${item.slug}/`)}">${item.label}</a></li>`,
    ),
    `  <li><a href="${relativeDocLink(homeRoute, "/packages/")}">Package reference</a></li>`,
    `  <li><a href="${relativeDocLink(homeRoute, "/runtimes/")}">Runtime reference</a></li>`,
    `  <li><a href="${relativeDocLink(homeRoute, "/examples/")}">Examples</a></li>`,
    "</ul>",
    "",
    "## How the pieces fit together",
    "",
    "```text",
    ...siteConfig.home.howPiecesFit,
    "```",
    "",
    "## What QueueFlow owns",
    "",
    ...siteConfig.home.whatQueueFlowOwns.map((item) => `- ${item}`),
    "",
    "## What your app still owns",
    "",
    ...siteConfig.home.whatYourAppOwns.map((item) => `- ${item}`),
    "",
    "## Current maturity",
    "",
    ...siteConfig.home.maturity.map((item) => `- ${item}`),
    "",
    `> Source repository: [${repositoryFullName}](https://github.com/${repositoryFullName})`,
    "",
  ].join("\n");

  await writeText(path.join(docsDir, "index.md"), body);
}

async function writeProjectDocs(readme, docsMap, license) {
  const aboutRoute = "/project/about/";
  const docsMapRoute = "/project/docs-map/";
  const licenseRoute = "/project/license/";
  const routeMap = new Map([
    ["README.md", relativeDocLink(aboutRoute, aboutRoute)],
    ["docs/README.md", relativeDocLink(aboutRoute, docsMapRoute)],
    ["LICENSE", relativeDocLink(aboutRoute, licenseRoute)],
  ]);

  await writeText(
    path.join(projectDocsDir, "about.md"),
    [
      "---",
      'title: "About"',
      `description: ${yamlString(`Project overview and repository boundaries for ${siteConfig.title}.`)}`,
      "sidebar:",
      '  label: "About"',
      "  order: 1",
      "---",
      "",
      `> Source: [\`README.md\`](https://github.com/${repositoryFullName}/blob/${repositoryBranch}/README.md)`,
      "",
      rewriteMarkdownLinks(
        stripLeadingHeading(readme),
        "README.md",
        routeMap,
      ).trim(),
      "",
    ].join("\n"),
  );

  await writeText(
    path.join(projectDocsDir, "docs-map.md"),
    [
      "---",
      'title: "Docs map"',
      `description: ${yamlString(`How the ${siteConfig.title} documentation is organized.`)}`,
      "sidebar:",
      '  label: "Docs map"',
      "  order: 2",
      "---",
      "",
      `> Source: [\`docs/README.md\`](https://github.com/${repositoryFullName}/blob/${repositoryBranch}/docs/README.md)`,
      "",
      rewriteMarkdownLinks(
        stripLeadingHeading(docsMap),
        "docs/README.md",
        routeMap,
      ).trim(),
      "",
    ].join("\n"),
  );

  await writeText(
    path.join(projectDocsDir, "license.md"),
    [
      "---",
      'title: "License"',
      'description: "Repository license terms."',
      "sidebar:",
      '  label: "License"',
      "  order: 3",
      "---",
      "",
      `> Source: [\`LICENSE\`](https://github.com/${repositoryFullName}/blob/${repositoryBranch}/LICENSE)`,
      "",
      "```text",
      license.trim(),
      "```",
      "",
    ].join("\n"),
  );
}

async function writePackageDocs(packages) {
  const packagesIndexRoute = "/packages/";
  await writeText(
    path.join(packagesDocsDir, "index.md"),
    [
      "---",
      'title: "Packages"',
      `description: ${yamlString(`Workspace package reference for the ${siteConfig.title} monorepo.`)}`,
      "sidebar:",
      '  label: "Overview"',
      "  order: 0",
      "---",
      "",
      siteConfig.packagesIndexIntro,
      "",
      ...siteConfig.packageGroups.flatMap((group) => [
        `## ${group.label}`,
        "",
        ...group.slugs
          .map((slug) => packages.find((pkg) => pkg.slug === slug))
          .filter(Boolean)
          .map(
            (pkg) =>
              `- [\`${pkg.title}\`](${relativeDocLink(packagesIndexRoute, `/packages/${pkg.slug}/`)}): ${pkg.description}`,
          ),
        "",
      ]),
    ].join("\n"),
  );

  let order = 1;
  for (const pkg of packages) {
    await writeWorkspaceDoc({
      record: pkg,
      baseRoute: "/packages/",
      targetDir: packagesDocsDir,
      order,
      purposeLabel: "Purpose",
      whatItGivesYouLabel: "What it gives you",
      useWhenLabel: "Use this when",
    });
    order += 1;
  }
}

async function writeRuntimeDocs(runtimes) {
  const runtimesIndexRoute = "/runtimes/";
  await writeText(
    path.join(runtimesDocsDir, "index.md"),
    [
      "---",
      'title: "Runtimes"',
      `description: ${yamlString(`Reference for the ${siteConfig.title} runtime applications.`)}`,
      "sidebar:",
      '  label: "Overview"',
      "  order: 0",
      "---",
      "",
      siteConfig.runtimesIndexIntro,
      "",
      ...runtimes.map(
        (runtime) =>
          `- [\`${runtime.title}\`](${relativeDocLink(runtimesIndexRoute, `/runtimes/${runtime.slug}/`)}): ${runtime.description}`,
      ),
      "",
    ].join("\n"),
  );

  let order = 1;
  for (const runtime of runtimes) {
    await writeWorkspaceDoc({
      record: runtime,
      baseRoute: "/runtimes/",
      targetDir: runtimesDocsDir,
      order,
      purposeLabel: "Purpose",
      whatItGivesYouLabel: "Responsibilities",
      useWhenLabel: "Start here if",
    });
    order += 1;
  }
}

async function writeExampleDocs(examples) {
  const examplesIndexRoute = "/examples/";
  await writeText(
    path.join(examplesDocsDir, "index.md"),
    [
      "---",
      'title: "Examples"',
      `description: ${yamlString(`Runnable integration examples for ${siteConfig.title}.`)}`,
      "sidebar:",
      '  label: "Overview"',
      "  order: 0",
      "---",
      "",
      siteConfig.examplesIndexIntro,
      "",
      ...examples.map(
        (example) =>
          `- [\`${example.title}\`](${relativeDocLink(examplesIndexRoute, `/examples/${example.slug}/`)}): ${example.description}`,
      ),
      "",
    ].join("\n"),
  );

  let order = 1;
  for (const example of examples) {
    const docs = example.docs ?? {};
    const sourceLinks = example.sourceFiles
      .map((sourcePath) => `[\`${sourcePath}\`](${githubBlobUrl(sourcePath)})`)
      .join(" | ");
    const bestFor = (docs.bestFor ?? []).map((item) => `- ${item}`).join("\n");
    const demonstrates = (docs.demonstrates ?? [])
      .map((item) => `- ${item}`)
      .join("\n");
    const expectedOutcome = (docs.expectedOutcome ?? [])
      .map((item) => `- ${item}`)
      .join("\n");
    const tryThisFirst = docs.tryThisFirst
      ? [
          "",
          "## Try this first",
          "",
          `\`\`\`${docs.tryThisFirst.language}`,
          ...docs.tryThisFirst.code,
          "```",
        ]
      : [];

    await writeText(
      path.join(examplesDocsDir, `${example.slug}.md`),
      [
        "---",
        `title: ${yamlString(example.title)}`,
        `description: ${yamlString(example.description)}`,
        "sidebar:",
        `  order: ${order}`,
        "---",
        "",
        `> Sources: ${sourceLinks}`,
        "",
        "## Purpose",
        "",
        example.description,
        "",
        "## Start here if",
        "",
        bestFor ||
          "- You want the shortest path to understand this example shape.",
        "",
        "## What it demonstrates",
        "",
        demonstrates ||
          "- See the source files for the current integration story.",
        "",
        "## Workspace details",
        "",
        `- Example path: \`${example.workspacePath}\``,
        ...(docs.runCommand ? [`- Run command: \`${docs.runCommand}\``] : []),
        ...tryThisFirst,
        ...(expectedOutcome
          ? ["", "## Expected outcome", "", expectedOutcome]
          : []),
        "",
      ].join("\n"),
    );

    order += 1;
  }
}

async function writeWorkspaceDoc({
  record,
  baseRoute,
  targetDir,
  order,
  purposeLabel,
  whatItGivesYouLabel,
  useWhenLabel,
}) {
  const docRoute = `${baseRoute}${record.slug}/`;
  const packageJsonPath = path.posix.join(record.workspacePath, "package.json");
  const sourceLinks = [packageJsonPath, ...record.sourceFiles]
    .filter(Boolean)
    .map((sourcePath) => `[\`${sourcePath}\`](${githubBlobUrl(sourcePath)})`)
    .join(" | ");
  const provides = (
    record.docs?.provides ??
    record.docs?.responsibilities ??
    []
  )
    .map((item) => `- ${item}`)
    .join("\n");
  const useWhen = (record.docs?.useWhen ?? record.docs?.bestFor ?? [])
    .map((item) => `- ${item}`)
    .join("\n");
  const related = (record.docs?.related ?? [])
    .map(
      (slug) =>
        `- [\`${slug.startsWith("@fengsoft/") ? slug : slug === "sdk" ? siteConfig.packagePrefix : `${siteConfig.packagePrefix}-${slug}`}\`](${relativeDocLink(docRoute, `/packages/${slug}/`)})`,
    )
    .join("\n");
  const youStillOwn = (record.docs?.youStillOwn ?? [])
    .map((item) => `- ${item}`)
    .join("\n");
  const externalDependencies =
    record.externalDependencies.length > 0
      ? record.externalDependencies
          .map((dependency) => `- \`${dependency}\``)
          .join("\n")
      : "- None";
  const internalDependencies =
    record.internalDependencies.length > 0
      ? record.internalDependencies
          .map((dependency) => {
            const slug =
              dependency.replace(siteConfig.packagePrefix, "") || "sdk";
            const normalizedSlug = slug.startsWith("-")
              ? slug.slice(1)
              : slug.replace("@fengsoft/", "");
            return `- [\`${dependency}\`](${relativeDocLink(docRoute, `/packages/${normalizedSlug}/`)})`;
          })
          .join("\n")
      : "- None";
  const scripts = Object.entries(record.packageJson.scripts ?? {})
    .map(([name, command]) => `- \`${name}\`: \`${command}\``)
    .join("\n");
  const routes = (record.docs?.routes ?? [])
    .map((route) => `- ${route}`)
    .join("\n");
  const sample = record.docs?.sample
    ? [
        "",
        `## ${record.docs.sample.title}`,
        "",
        `\`\`\`${record.docs.sample.language}`,
        ...record.docs.sample.code,
        "```",
      ]
    : [];

  await writeText(
    path.join(targetDir, `${record.slug}.md`),
    [
      "---",
      `title: ${yamlString(record.title)}`,
      `description: ${yamlString(record.description)}`,
      "sidebar:",
      `  order: ${order}`,
      "---",
      "",
      `> Sources: ${sourceLinks}`,
      "",
      `## ${purposeLabel}`,
      "",
      record.description,
      "",
      `## ${whatItGivesYouLabel}`,
      "",
      provides || "- See the source files for the current surface area.",
      "",
      `## ${useWhenLabel}`,
      "",
      useWhen ||
        "- Adopt this workspace when it matches your runtime or integration shape.",
      ...sample,
      "",
      "## Workspace details",
      "",
      `- Package name: \`${record.title}\``,
      `- Workspace path: \`${record.workspacePath}\``,
      ...(record.docs?.runCommand
        ? [`- Run command: \`${record.docs.runCommand}\``]
        : []),
      ...(record.docs?.localSurface
        ? [`- Local surface: \`${record.docs.localSurface}\``]
        : []),
      "",
      "## Internal dependencies",
      "",
      internalDependencies,
      "",
      "## External dependencies",
      "",
      externalDependencies,
      ...(related ? ["", "## Usually paired with", "", related] : []),
      ...(routes ? ["", "## Current routes", "", routes] : []),
      ...(youStillOwn ? ["", "## You still own", "", youStillOwn] : []),
      ...(scripts ? ["", "## Scripts", "", scripts] : []),
      "",
    ].join("\n"),
  );
}

async function readRepoFile(relativePath) {
  return fs.readFile(path.join(repoDir, relativePath), "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function resetDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

function rewriteMarkdownLinks(markdown, sourcePath, routeMap) {
  const sourceDir = path.posix.dirname(sourcePath);

  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, href) => {
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:") ||
      href.startsWith("#")
    ) {
      return match;
    }

    const normalizedTarget = path.posix.normalize(
      path.posix.join(sourceDir, href.replace(/^\.\//, "")),
    );
    const route = routeMap.get(normalizedTarget);
    return route ? `[${label}](${route})` : match;
  });
}

function relativeDocLink(fromRoute, toRoute) {
  const fromDir = path.posix.dirname(
    path.posix.join(normalizeDocRoute(fromRoute), "index.html"),
  );
  const toDir = path.posix.dirname(
    path.posix.join(normalizeDocRoute(toRoute), "index.html"),
  );
  let relativePath = path.posix.relative(fromDir, toDir);

  if (!relativePath) {
    return "./";
  }

  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }

  return relativePath.endsWith("/") ? relativePath : `${relativePath}/`;
}

function normalizeDocRoute(route) {
  if (route === "/") {
    return route;
  }

  return `/${route.replace(/^\/+|\/+$/g, "")}/`;
}

function stripLeadingHeading(content) {
  return content.replace(/^# .+\n+/, "");
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function yamlString(value) {
  return JSON.stringify(value);
}

function githubBlobUrl(relativePath) {
  return `https://github.com/${repositoryFullName}/blob/${repositoryBranch}/${relativePath}`;
}

await main();
