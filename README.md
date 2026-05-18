# Reusable GitHub Actions Workflows

These workflows are intended for use in the public repositories
managed the Fastly Developer Experience Engineering team. Since the
repository is public anyone is free to use if them if they wish, but
the team does not make any guarantees about maintaining compatibility
when changes are made.

## Workflows

### `compute-starter-kit-rust-v1.yml`

TODO: Add description

### `compute-starter-kit-rust-v2.yml`

TODO: Add description

### `dependabot-changelog-update.yml`

TODO: Add description

### `process-semver-v1.yml`

Processes a provided string or the tag name as a SemVer.

#### Inputs

* `version` - (optional) The version string to process, with or without a leading v,
  e.g. `1.2.3` or `v1.2.3-rc.1`. If not provided, then the current tag name is used.

* `tag_prefix` - Tag prefix, when triggered by a tag. This prefix is strict and
  must fully match the tag format (e.g. `'v'` → `v1.2.3`, `'release/v'` → `release/v1.2.3`).

#### Outputs

If the string is successfully processed as a SemVer, the workflow succeeds and produces two outputs:

* `version` - the SemVer string, such as `1.2.3` or `1.2.3-beta.0`

* `dist_tag` - the "tag" part of the semver (such as `beta`, `rc`, or `latest` if not provided)

If the string is not process as a SemVer, the workflow fails.

### `publish-javascript-github-v1.yml`

Publishes a package to GitHub Packages, using the provided dist tag. Optionally checks the package's
name and version.

#### Inputs

* `expected_pkg_name` - (optional) Expected package name. If provided, must match the `name`
  field in the `package.json` file, or the workflow fails.

* `expected_pkg_version` - (optional) Expected package version. If provided, must match the `version`
  field in the `package.json` file, or the workflow fails.

* `dist_tag` - Dist tag to release, e.g., `latest`, `alpha`, `beta`, `rc`. If not provided,
  defaults to `latest`.

* `node_auth_token` - Token used to authenticate to GitHub Packages. If not provided,
  defaults to `secrets.GITHUB_TOKEN`.

* `dry_run` - If set to `"true"`, passes `--dry-run` to `npm publish`.
  If not provided, defaults to `"false"`.

* `cwd` - Path to directory containing `package.json`, relative to the repo root. If not provided,
  defaults to the repo root.

#### Outputs

If all the following steps are successful, the workflow succeeds.
- there is a `package.json` file in the `cwd` directory
- if `expected_*` checks are provided, they pass
- the `npm publish` command successfully publishes the package to npmjs.org

Otherwise, the workflow fails.

#### Notes

If `node_auth_token` is provided, the token must have permissions to publish the package.

If `node_auth_token` is not provided, then the calling workflow must have permissions
to publish the package. A workflow can be given permissions by adding the permission:

```yaml
permissions:
  contents: read
  packages: write
```

### `publish-javascript-npmjs-v1.yml`

Publishes a package to npmjs.org, using the provided dist tag. Optionally checks the package's
name and version.

#### Inputs

* `expected_pkg_name` - (optional) Expected package name. If provided, must match the `name`
  field in the `package.json` file, or the workflow fails.

* `expected_pkg_version` - (optional) Expected package version. If provided, must match the `version`
  field in the `package.json` file, or the workflow fails.

* `dist_tag` - Dist tag to release, e.g., `latest`, `alpha`, `beta`, `rc`. If not provided,
  defaults to `latest`.

* `dry_run` - If set to `"true"`, passes `--dry-run` to `npm publish`.
  If not provided, defaults to `"false"`.

* `cwd` - Path to directory containing `package.json`, relative to the repo root. If not provided,
  defaults to the repo root.

#### Outputs

If all the following steps are successful, the workflow succeeds.
- there is a `package.json` file in the `cwd` directory
- if `expected_*` checks are provided, they pass
- the `npm publish` command successfully publishes the package to npmjs.org

Otherwise, the workflow fails.

#### Notes

Authentication for publishing the package to npmjs.org is performed using
[trusted publishing](https://docs.npmjs.com/trusted-publishers).

- The package must be set up for trusted publishing.
  [See the npm docs](https://docs.npmjs.com/trusted-publishers#step-1-add-a-trusted-publisher-on-npmjscom)
  for detailed instructions on adding the calling workflow as a trusted publisher
  under the settings tab of the package page on npmjs.org.

- The calling workflow must have permissions to generate OIDC tokens.
  A workflow can be given permissions by adding the permission:
  ```yaml
  permissions:
    id-token: write
    contents: read
  ```

### `publish-rust-crates-io-v1.yml`

Publishes a Rust crate to crates.io using trusted publishing. Optionally checks the crate's
version before publishing.

#### Inputs

* `crate_name` - (optional) Name of the crate to publish. If not provided, will publish
  the root package.

* `expected_version` - (optional) Expected crate version. If provided, must match the `version`
  field in the crate's `Cargo.toml` file, or the workflow fails. Requires `crate_name` to also
  be specified; the workflow will fail if `expected_version` is set without `crate_name`.

#### Outputs

If all the following steps are successful, the workflow succeeds:
- Rust toolchain is installed
- if `expected_version` check is provided, it passes
- the `cargo publish --locked` command successfully publishes the crate to crates.io

Otherwise, the workflow fails.

#### Notes

Authentication for publishing the crate to crates.io is performed using
[trusted publishing](https://doc.rust-lang.org/cargo/reference/publishing.html#trusted-publishing).

- The crate must be set up for trusted publishing.
  See the [crates.io trusted publishing documentation](https://crates.io/docs/trusted-publishing)
  for detailed instructions on configuring the calling workflow as a trusted publisher.

- The calling workflow must have permissions to generate OIDC tokens.
  A workflow can be given permissions by adding the permission:
  ```yaml
  permissions:
    id-token: write
    contents: read
  ```

#### Example Usage

Example for publishing a crate when a version tag is pushed:

```yaml
name: Release

on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+"

jobs:
  publish:
    permissions:
      id-token: write
      contents: read
    uses: fastly/devex-reusable-workflows/.github/workflows/publish-rust-crates-io-v1.yml@main
    with:
      crate_name: my-crate-name
      expected_version: ${{ github.ref_name }}
```

## Actions

### `publish-javascript-github-v1`

TODO: Add description

### `publish-javascript-npmjs-v1`

TODO: Add description

### `validate-javascript-package-v1`

TODO: Add description

## Security issues

Please see [SECURITY.md](SECURITY.md) for guidance on reporting
security-related issues.
