/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 392:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(426);
const github = __nccwpck_require__(922);
const parser = __nccwpck_require__(221);
(__nccwpck_require__(121).config)();

const IS_PR = ["pull_request", "pull_request_target"].includes(
  github.context.eventName
);

const context = {
  GITHUB_TOKEN: parser.getInput({
    key: ["GH_PAT", "GITHUB_TOKEN"],
    required: true,
  }),
  VERCEL_TOKEN: parser.getInput({
    key: "VERCEL_TOKEN",
    required: true,
  }),
  VERCEL_ORG_ID: parser.getInput({
    key: "VERCEL_ORG_ID",
    required: true,
  }),
  VERCEL_PROJECT_ID: parser.getInput({
    key: "VERCEL_PROJECT_ID",
    required: true,
  }),
  PRODUCTION: parser.getInput({
    key: "PRODUCTION",
    type: "boolean",
    default: !IS_PR,
  }),
  GITHUB_DEPLOYMENT: parser.getInput({
    key: "GITHUB_DEPLOYMENT",
    type: "boolean",
    default: true,
  }),
  CREATE_COMMENT: parser.getInput({
    key: "CREATE_COMMENT",
    type: "boolean",
    default: true,
  }),
  DELETE_EXISTING_COMMENT: parser.getInput({
    key: "DELETE_EXISTING_COMMENT",
    type: "boolean",
    default: true,
  }),
  ATTACH_COMMIT_METADATA: parser.getInput({
    key: "ATTACH_COMMIT_METADATA",
    type: "boolean",
    default: true,
  }),
  DEPLOY_PR_FROM_FORK: parser.getInput({
    key: "DEPLOY_PR_FROM_FORK",
    type: "boolean",
    default: false,
  }),
  PR_LABELS: parser.getInput({
    key: "PR_LABELS",
    default: ["deployed"],
    type: "array",
    disableable: true,
  }),
  ALIAS_DOMAINS: parser.getInput({
    key: "ALIAS_DOMAINS",
    type: "array",
    disableable: true,
  }),
  PR_PREVIEW_DOMAIN: parser.getInput({
    key: "PR_PREVIEW_DOMAIN",
  }),
  VERCEL_SCOPE: parser.getInput({
    key: "VERCEL_SCOPE",
  }),
  RELEASE_TAG: parser.getInput({
    key: "RELEASE_TAG",
  }),
  GITHUB_REPOSITORY: parser.getInput({
    key: "GITHUB_REPOSITORY",
    required: true,
  }),
  GITHUB_DEPLOYMENT_ENV: parser.getInput({
    key: "GITHUB_DEPLOYMENT_ENV",
  }),
  TRIM_COMMIT_MESSAGE: parser.getInput({
    key: "TRIM_COMMIT_MESSAGE",
    type: "boolean",
    default: false,
  }),
  WORKING_DIRECTORY: parser.getInput({
    key: "WORKING_DIRECTORY",
  }),
  BUILD_ENV: parser.getInput({
    key: "BUILD_ENV",
    type: "array",
  }),
  PREBUILT: parser.getInput({
    key: "PREBUILT",
    type: "boolean",
    default: false,
  }),
  RUNNING_LOCAL: process.env.RUNNING_LOCAL === "true",
  FORCE: parser.getInput({
    key: "FORCE",
    type: "boolean",
    default: false,
  }),
};

const setDynamicVars = () => {
  context.USER = context.GITHUB_REPOSITORY.split("/")[0];
  context.REPOSITORY = context.GITHUB_REPOSITORY.split("/")[1];

  // If running the action locally, use env vars instead of github.context
  if (context.RUNNING_LOCAL) {
    context.SHA = process.env.SHA || "XXXXXXX";
    context.IS_PR = process.env.IS_PR === "true" || false;
    context.PR_NUMBER = process.env.PR_NUMBER || undefined;
    context.REF = process.env.REF || "refs/heads/master";
    context.BRANCH = process.env.BRANCH || "master";
    context.PRODUCTION = process.env.PRODUCTION === "true" || !context.IS_PR;
    context.LOG_URL =
      process.env.LOG_URL ||
      `https://github.com/${context.USER}/${context.REPOSITORY}`;
    context.ACTOR = process.env.ACTOR || context.USER;
    context.IS_FORK = process.env.IS_FORK === "true" || false;
    context.TRIM_COMMIT_MESSAGE =
      process.env.TRIM_COMMIT_MESSAGE === "true" || false;

    return;
  }

  context.IS_PR = IS_PR;
  context.LOG_URL = `https://github.com/${context.USER}/${context.REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

  // Use different values depending on if the Action was triggered by a PR
  if (context.IS_PR) {
    context.PR_NUMBER = github.context.payload.number;
    context.ACTOR = github.context.payload.pull_request.user.login;
    context.REF = github.context.payload.pull_request.head.ref;
    context.SHA = github.context.payload.pull_request.head.sha;
    context.BRANCH = context.REF;
    context.IS_FORK =
      github.context.payload.pull_request.head.repo.full_name !==
      context.GITHUB_REPOSITORY;
  } else {
    context.ACTOR = github.context.actor;
    context.REF = github.context.ref;
    context.SHA = github.context.sha;
    context.BRANCH = github.context.ref;
  }
};

setDynamicVars();

core.setSecret(context.GITHUB_TOKEN);
core.setSecret(context.VERCEL_TOKEN);

core.debug(JSON.stringify(context, null, 2));

module.exports = context;


/***/ }),

/***/ 691:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const github = __nccwpck_require__(922)

const {
	GITHUB_TOKEN,
	USER,
	REPOSITORY,
	PRODUCTION,
	PR_NUMBER,
	REF,
	LOG_URL,
	PR_LABELS,
	GITHUB_DEPLOYMENT_ENV
} = __nccwpck_require__(392)

const init = () => {
	const client = github.getOctokit(GITHUB_TOKEN, { previews: [ 'flash', 'ant-man' ] })

	let deploymentId

	const createDeployment = async () => {
		const deployment = await client.repos.createDeployment({
			owner: USER,
			repo: REPOSITORY,
			ref: REF,
			required_contexts: [],
			environment: GITHUB_DEPLOYMENT_ENV || (PRODUCTION ? 'Production' : 'Preview'),
			description: 'Deploy to Vercel',
			auto_merge: false
		})

		deploymentId = deployment.data.id

		return deployment.data
	}

	const updateDeployment = async (status, url) => {
		if (!deploymentId) return

		const deploymentStatus = await client.repos.createDeploymentStatus({
			owner: USER,
			repo: REPOSITORY,
			deployment_id: deploymentId,
			state: status,
			log_url: LOG_URL,
			environment_url: url || LOG_URL,
			description: 'Starting deployment to Vercel',
			auto_inactive: false,
		})

		return deploymentStatus.data
	}

	const deleteExistingComment = async () => {
		const { data } = await client.issues.listComments({
			owner: USER,
			repo: REPOSITORY,
			issue_number: PR_NUMBER
		})

		if (data.length < 1) return

		const comment = data.find((comment) => comment.body.includes('This pull request has been deployed to Vercel.'))
		if (comment) {
			await client.issues.deleteComment({
				owner: USER,
				repo: REPOSITORY,
				comment_id: comment.id
			})

			return comment.id
		}
	}

	const createComment = async (body) => {
		// Remove indentation
		const dedented = body.replace(/^[^\S\n]+/gm, '')

		const comment = await client.issues.createComment({
			owner: USER,
			repo: REPOSITORY,
			issue_number: PR_NUMBER,
			body: dedented
		})

		return comment.data
	}

	const addLabel = async () => {
		const label = await client.issues.addLabels({
			owner: USER,
			repo: REPOSITORY,
			issue_number: PR_NUMBER,
			labels: PR_LABELS
		})

		return label.data
	}

	const getCommit = async () => {
		const { data } = await client.repos.getCommit({
			owner: USER,
			repo: REPOSITORY,
			ref: REF
		})

		return {
			authorName: data.commit.author.name,
			authorLogin: data.author.login,
			commitMessage: data.commit.message
		}
	}

	return {
		client,
		createDeployment,
		updateDeployment,
		deleteExistingComment,
		createComment,
		addLabel,
		getCommit
	}
}

module.exports = {
	init
}

/***/ }),

/***/ 662:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(426);
const { spawn } = __nccwpck_require__(81);

const execCmd = (command, args, cwd) => {
  core.debug(`EXEC: "${command} ${args}" in ${cwd || "."}`);
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { cwd });
    let stdout;
    let stderr;

    process.stdout.on("data", (data) => {
      core.debug(data.toString());
      if (data !== undefined && data.length > 0) {
        stdout += data;
      }
    });

    process.stderr.on("data", (data) => {
      core.debug(data.toString());
      if (data !== undefined && data.length > 0) {
        stderr += data;
      }
    });

    process.on("close", (code) => {
      code !== 0 ? reject(new Error(stderr)) : resolve(stdout?.trim());
    });
  });
};

const addSchema = (url) => {
  const regex = /^https?:\/\//;
  if (!regex.test(url)) {
    return `https://${url}`;
  }

  return url;
};

const removeSchema = (url) => {
  const regex = /^https?:\/\//;
  return url.replace(regex, "");
};

const getClearedBranchName = (branch) =>
  branch ? branch.replace("refs/heads/", "").split("/").join("-") : "";

const replaceDotsToDashes = (str) => (str ? str.replace(/\./g, "-") : "");

module.exports = {
  exec: execCmd,
  addSchema,
  removeSchema,
  getClearedBranchName,
  replaceDotsToDashes,
};


/***/ }),

/***/ 348:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(426)
const got = __nccwpck_require__(902)
const { exec, removeSchema } = __nccwpck_require__(662)

const {
	VERCEL_TOKEN,
	PRODUCTION,
	VERCEL_SCOPE,
	VERCEL_ORG_ID,
	VERCEL_PROJECT_ID,
	SHA,
	USER,
	REPOSITORY,
	REF,
	TRIM_COMMIT_MESSAGE,
	BUILD_ENV,
	PREBUILT,
	WORKING_DIRECTORY,
	FORCE
} = __nccwpck_require__(392)

const init = () => {
	core.info('Setting environment variables for Vercel CLI')
	core.exportVariable('VERCEL_ORG_ID', VERCEL_ORG_ID)
	core.exportVariable('VERCEL_PROJECT_ID', VERCEL_PROJECT_ID)

	let deploymentUrl

	const deploy = async (commit) => {
		let commandArguments = [ `--token=${ VERCEL_TOKEN }` ]

		if (VERCEL_SCOPE) {
			commandArguments.push(`--scope=${ VERCEL_SCOPE }`)
		}

		if (PRODUCTION) {
			commandArguments.push('--prod')
		}

		if (PREBUILT) {
			commandArguments.push('--prebuilt')
		}

		if (FORCE) {
			commandArguments.push('--force')
		}

		if (commit) {
			const metadata = [
				`githubCommitAuthorName=${ commit.authorName }`,
				`githubCommitAuthorLogin=${ commit.authorLogin }`,
				`githubCommitMessage=${ TRIM_COMMIT_MESSAGE ? commit.commitMessage.split(/\r?\n/)[0] : commit.commitMessage }`,
				`githubCommitOrg=${ USER }`,
				`githubCommitRepo=${ REPOSITORY }`,
				`githubCommitRef=${ REF }`,
				`githubCommitSha=${ SHA }`,
				`githubOrg=${ USER }`,
				`githubRepo=${ REPOSITORY }`,
				`githubDeployment=1`
			]

			metadata.forEach((item) => {
				commandArguments = commandArguments.concat([ '--meta', item ])
			})
		}

		if (BUILD_ENV) {
			BUILD_ENV.forEach((item) => {
				commandArguments = commandArguments.concat([ '--build-env', item ])
			})
		}

		core.info('Starting deploy with Vercel CLI')
		const output = await exec('vercel', commandArguments, WORKING_DIRECTORY)
		const parsed = output.match(/(?<=https?:\/\/)(.*)/g)[0]

		if (!parsed) throw new Error('Could not parse deploymentUrl')

		deploymentUrl = parsed

		return deploymentUrl
	}

	const assignAlias = async (aliasUrl) => {
		const commandArguments = [ `--token=${ VERCEL_TOKEN }`, 'alias', 'set', deploymentUrl, removeSchema(aliasUrl) ]

		if (VERCEL_SCOPE) {
			commandArguments.push(`--scope=${ VERCEL_SCOPE }`)
		}

		const output = await exec('vercel', commandArguments, WORKING_DIRECTORY)

		return output
	}

	const getDeployment = async () => {
		const url = `https://api.vercel.com/v11/now/deployments/get?url=${ deploymentUrl }`
		const options = {
			headers: {
				Authorization: `Bearer ${ VERCEL_TOKEN }`
			}
		}

		const res = await got(url, options).json()

		return res
	}

	return {
		deploy,
		assignAlias,
		deploymentUrl,
		getDeployment
	}
}

module.exports = {
	init
}

/***/ }),

/***/ 426:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 922:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 221:
/***/ ((module) => {

module.exports = eval("require")("action-input-parser");


/***/ }),

/***/ 121:
/***/ ((module) => {

module.exports = eval("require")("dotenv");


/***/ }),

/***/ 902:
/***/ ((module) => {

module.exports = eval("require")("got");


/***/ }),

/***/ 81:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 113:
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(426);
const Github = __nccwpck_require__(691);
const Vercel = __nccwpck_require__(348);
const {
  addSchema,
  getClearedBranchName,
  replaceDotsToDashes,
} = __nccwpck_require__(662);
const crypto = __nccwpck_require__(113);

const {
  GITHUB_DEPLOYMENT,
  USER,
  REPOSITORY,
  BRANCH,
  PR_NUMBER,
  SHA,
  IS_PR,
  PR_LABELS,
  CREATE_COMMENT,
  DELETE_EXISTING_COMMENT,
  PR_PREVIEW_DOMAIN,
  ALIAS_DOMAINS,
  ATTACH_COMMIT_METADATA,
  LOG_URL,
  DEPLOY_PR_FROM_FORK,
  IS_FORK,
  ACTOR,
  RELEASE_TAG,
} = __nccwpck_require__(392);

// Following https://perishablepress.com/stop-using-unsafe-characters-in-urls/ only allow characters that won't break the URL.
const urlSafeParameter = (input) => input.replace(/[^a-z0-9_~]/gi, "-");

const run = async () => {
  const github = Github.init();

  // Refuse to deploy an untrusted fork
  if (IS_FORK === true && DEPLOY_PR_FROM_FORK === false) {
    core.warning(`PR is from fork and DEPLOY_PR_FROM_FORK is set to false`);
    const body = `
			Refusing to deploy this Pull Request to Vercel because it originates from @${ACTOR}'s fork.

			**@${USER}** To allow this behaviour set \`DEPLOY_PR_FROM_FORK\` to true ([more info](https://github.com/BetaHuhn/deploy-to-vercel-action#deploying-a-pr-made-from-a-fork-or-dependabot)).
		`;

    const comment = await github.createComment(body);
    core.info(`Comment created: ${comment.html_url}`);

    core.setOutput("DEPLOYMENT_CREATED", false);
    core.setOutput("COMMENT_CREATED", true);

    core.info("Done");
    return;
  }

  if (GITHUB_DEPLOYMENT) {
    core.info("Creating GitHub deployment");
    const ghDeployment = await github.createDeployment();

    core.info(`Deployment #${ghDeployment.id} created`);

    await github.updateDeployment("pending");
    core.info(`Deployment #${ghDeployment.id} status changed to "pending"`);
  }

  try {
    core.info(`Creating deployment with Vercel CLI`);
    const vercel = Vercel.init();

    const commit = ATTACH_COMMIT_METADATA
      ? await github.getCommit()
      : undefined;
    const deploymentUrl = await vercel.deploy(commit);

    core.info("Successfully deployed to Vercel!");

    const deploymentUrls = [];
    if (IS_PR && PR_PREVIEW_DOMAIN) {
      core.info(`Assigning custom preview domain to PR`);

      if (typeof PR_PREVIEW_DOMAIN !== "string") {
        throw new Error(`invalid type for PR_PREVIEW_DOMAIN`);
      }

      const alias = PR_PREVIEW_DOMAIN.replace("{USER}", urlSafeParameter(USER))
        .replace("{REPO}", urlSafeParameter(REPOSITORY))
        .replace("{BRANCH}", getClearedBranchName(urlSafeParameter(BRANCH)))
        .replace(
          "{RELEASE_TAG}",
          replaceDotsToDashes(urlSafeParameter(RELEASE_TAG))
        )
        .replace("{PR}", PR_NUMBER)
        .replace("{SHA}", SHA.substring(0, 7))
        .toLowerCase();

      const previewDomainSuffix = ".vercel.app";
      let nextAlias = alias;

      if (alias.endsWith(previewDomainSuffix)) {
        let prefix = alias.substring(0, alias.indexOf(previewDomainSuffix));

        if (prefix.length >= 60) {
          core.warning(
            `The alias ${prefix} exceeds 60 chars in length, truncating using vercel's rules. See https://vercel.com/docs/concepts/deployments/automatic-urls#automatic-branch-urls`
          );
          prefix = prefix.substring(0, 55);
          const uniqueSuffix = crypto
            .createHash("sha256")
            .update(`git-${BRANCH}-${REPOSITORY}`)
            .digest("hex")
            .slice(0, 6);

          nextAlias = `${prefix}-${uniqueSuffix}${previewDomainSuffix}`;
          core.info(`Updated domain alias: ${nextAlias}`);
        }
      }

      await vercel.assignAlias(nextAlias);
      deploymentUrls.push(addSchema(nextAlias));
    }

    if (!IS_PR && ALIAS_DOMAINS) {
      core.info(`Assigning custom domains to Vercel deployment`);

      if (!Array.isArray(ALIAS_DOMAINS)) {
        throw new Error(`invalid type for PR_PREVIEW_DOMAIN`);
      }

      for (let i = 0; i < ALIAS_DOMAINS.length; i++) {
        const alias = ALIAS_DOMAINS[i]
          .replace("{USER}", urlSafeParameter(USER))
          .replace("{REPO}", urlSafeParameter(REPOSITORY))
          .replace("{BRANCH}", getClearedBranchName(urlSafeParameter(BRANCH)))
          .replace(
            "{RELEASE_TAG}",
            replaceDotsToDashes(urlSafeParameter(RELEASE_TAG))
          )
          .replace("{SHA}", SHA.substring(0, 7))
          .toLowerCase();

        await vercel.assignAlias(alias);

        deploymentUrls.push(addSchema(alias));
      }
    }

    deploymentUrls.push(addSchema(deploymentUrl));
    const previewUrl = deploymentUrls[0];

    const deployment = await vercel.getDeployment();
    core.info(
      `Deployment "${deployment.id}" available at: ${deploymentUrls.join(", ")}`
    );

    if (GITHUB_DEPLOYMENT) {
      core.info('Changing GitHub deployment status to "success"');
      await github.updateDeployment("success", previewUrl);
    }

    if (IS_PR) {
      if (DELETE_EXISTING_COMMENT) {
        core.info("Checking for existing comment on PR");
        const deletedCommentId = await github.deleteExistingComment();

        if (deletedCommentId)
          core.info(`Deleted existing comment #${deletedCommentId}`);
      }

      if (CREATE_COMMENT) {
        core.info("Creating new comment on PR");
        const body = `
					This pull request has been deployed to Vercel.

					<table>
						<tr>
							<td><strong>Latest commit:</strong></td>
							<td><code>${SHA.substring(0, 7)}</code></td>
						</tr>
						<tr>
							<td><strong>✅ Preview:</strong></td>
							<td><a href='${previewUrl}'>${previewUrl}</a></td>
						</tr>
						<tr>
							<td><strong>🔍 Inspect:</strong></td>
							<td><a href='${deployment.inspectorUrl}'>${deployment.inspectorUrl}</a></td>
						</tr>
					</table>

					[View Workflow Logs](${LOG_URL})
				`;

        const comment = await github.createComment(body);
        core.info(`Comment created: ${comment.html_url}`);
      }

      if (PR_LABELS) {
        core.info("Adding label(s) to PR");
        const labels = await github.addLabel();

        core.info(
          `Label(s) "${labels.map((label) => label.name).join(", ")}" added`
        );
      }
    }

    core.setOutput("PREVIEW_URL", previewUrl);
    core.setOutput("DEPLOYMENT_URLS", deploymentUrls);
    core.setOutput(
      "DEPLOYMENT_UNIQUE_URL",
      deploymentUrls[deploymentUrls.length - 1]
    );
    core.setOutput("DEPLOYMENT_ID", deployment.id);
    core.setOutput("DEPLOYMENT_INSPECTOR_URL", deployment.inspectorUrl);
    core.setOutput("DEPLOYMENT_CREATED", true);
    core.setOutput("COMMENT_CREATED", IS_PR && CREATE_COMMENT);

    core.info("Done");
  } catch (err) {
    await github.updateDeployment("failure");
    core.setFailed(err.message);
  }
};

run()
  .then(() => {})
  .catch((err) => {
    core.error("ERROR");
    core.setFailed(err.message);
  });

})();

module.exports = __webpack_exports__;
/******/ })()
;