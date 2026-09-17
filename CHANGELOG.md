# Changelog

## [0.5.0](https://github.com/kirchDev/gitignore-sync/compare/v0.4.0...v0.5.0) (2026-09-16)


### Features

* **discover:** recognise laravel's database stub as a framework file ([6d281b2](https://github.com/kirchDev/gitignore-sync/commit/6d281b23b6ccde37a04dcfa52c72ec62dcf59fd1))
* **templates:** add agents v2 ignoring boost's machine-specific codex config ([8867b20](https://github.com/kirchDev/gitignore-sync/commit/8867b2058f72bc4874278d5ebf9de4b5048d8d94))
* **templates:** add an octane stack ([5b7335a](https://github.com/kirchDev/gitignore-sync/commit/5b7335a73742694a926c55ec49ab32f17b8a50a6))
* **templates:** add laravel v2 following the laravel 13 skeleton ([401d161](https://github.com/kirchDev/gitignore-sync/commit/401d1617922a27be4d0d7b0ed8a99add41812e73))
* **templates:** add php v2 with composer credentials and tooling caches ([a31ef10](https://github.com/kirchDev/gitignore-sync/commit/a31ef10279ecef91434da193c934b37b22efbaea))

## [0.4.0](https://github.com/kirchDev/gitignore-sync/compare/v0.3.1...v0.4.0) (2026-09-16)


### ⚠ BREAKING CHANGES

* move to pnpm 12
* this repository now requires pnpm 12.

### Features

* **ci:** call the central workflow bodies instead of copying them ([3b3b862](https://github.com/kirchDev/gitignore-sync/commit/3b3b862fa998c10e7ba92595996a74584df038e0))
* **ci:** call the release-please body instead of the last local copy ([6e04e62](https://github.com/kirchDev/gitignore-sync/commit/6e04e62f2d6e374c2c5ae86f94b0eca8332a1825))
* **templates:** add a gradle stack ([a1a6dfa](https://github.com/kirchDev/gitignore-sync/commit/a1a6dfaf494b31cdc342242d4770fef425997843))


### Bug Fixes

* **ci:** bump the workflow bodies to v0.1.3 ([b4e5173](https://github.com/kirchDev/gitignore-sync/commit/b4e51734888fd4309504ef47061eea7f69860022))
* **ci:** pin the publish body to the v0.1.0 SHA ([b40a3ba](https://github.com/kirchDev/gitignore-sync/commit/b40a3baffd129a0d882b38cc5cc05d8fd49d2f05))
* **ci:** pin the workflow bodies to v0.2.0 and drop paths-ignore ([c7f290a](https://github.com/kirchDev/gitignore-sync/commit/c7f290a86484ab69861f1dfb39b1eab70053fc0d))
* **ci:** pin the workflow bodies to v0.5.0 ([ed4d410](https://github.com/kirchDev/gitignore-sync/commit/ed4d410fb044b3f71bf8f0e486e82de6e0e1b9ab))
* **ci:** pin the workflow bodies to v0.7.0 ([82ed972](https://github.com/kirchDev/gitignore-sync/commit/82ed9729ca36b40c2eae35ebd9ca3650fc13e2f0))
* **ci:** publish prereleases only from main ([8372668](https://github.com/kirchDev/gitignore-sync/commit/837266825ac63ec76608a66335aa7c1cbe128eea))
* **config:** correct the codex policy match examples ([55aba23](https://github.com/kirchDev/gitignore-sync/commit/55aba23c47e54fc4b473729451b3f5434e21a546))


### Reverts

* go back to pnpm 11.25.0 ([097a03c](https://github.com/kirchDev/gitignore-sync/commit/097a03cdb357f820f89928578a6c5c66060d06e9))


### Miscellaneous Chores

* move to pnpm 12 ([590d1b7](https://github.com/kirchDev/gitignore-sync/commit/590d1b73c68fed0d918f1556179ca5e83ac94356))
* move to pnpm 12 ([e13b740](https://github.com/kirchDev/gitignore-sync/commit/e13b7403a565c889a839812d868a4ba9ef441fa5))

## [0.3.1](https://github.com/kirchDev/gitignore-sync/compare/v0.3.0...v0.3.1) (2026-09-01)


### Bug Fixes

* **ci:** pin the reusable workflow to a full commit hash ([14db690](https://github.com/kirchDev/gitignore-sync/commit/14db690497d0752edb734b4d1463c040ec0a1cf5))
* **ci:** publish to npm when release-please cuts a release ([4bb50b6](https://github.com/kirchDev/gitignore-sync/commit/4bb50b6e839fc7b3ffff38269ac6b2380fc3708c))

## [0.3.0](https://github.com/kirchDev/gitignore-sync/compare/v0.2.1...v0.3.0) (2026-09-01)


### Features

* **templates:** split the agent working files out of core ([bd6800e](https://github.com/kirchDev/gitignore-sync/commit/bd6800ea56f0fa6f2297ddf771a432696a253ebe))


### Bug Fixes

* **markers:** deduplicate the stacks line when writing it ([3684732](https://github.com/kirchDev/gitignore-sync/commit/36847322d6509efbe6736e020ba2499d0344b7f1))
* **reconcile:** render a stack named twice in the header only once ([020f1a4](https://github.com/kirchDev/gitignore-sync/commit/020f1a42039ccfc39e94ee14dca8a738a3235a59))
* **templates:** anchor the node stack's logs directory ([e217778](https://github.com/kirchDev/gitignore-sync/commit/e217778624cf876cd0492bc2dcc5adbc1eae0ffd))

## [0.2.1](https://github.com/kirchDev/gitignore-sync/compare/v0.2.0...v0.2.1) (2026-09-01)


### Bug Fixes

* **templates:** stop hiding two files Laravel commits ([d011299](https://github.com/kirchDev/gitignore-sync/commit/d0112995b8cdc8c25763b48bf60be868b2755af4))

## [0.2.0](https://github.com/kirchDev/gitignore-sync/compare/v0.1.0...v0.2.0) (2026-09-01)


### Features

* **cli:** add --recursive to audit and check ([43cb624](https://github.com/kirchDev/gitignore-sync/commit/43cb6247ee6eb944fcc15d058021cd46cf19ad9a))
* **discover:** classify and skip the .gitignore files a repo does not own ([866fe99](https://github.com/kirchDev/gitignore-sync/commit/866fe99854c7d1860b5620ba2656b49da8c84f97))

## 0.1.0 (2026-09-01)


### Features

* **ci:** move the major alias onto each release ([b8ca9bb](https://github.com/kirchDev/gitignore-sync/commit/b8ca9bb2cd8ebdeb81f8936f60d1760ebf75b4c5))
* **ci:** ship a composite action for the drift check ([2de4652](https://github.com/kirchDev/gitignore-sync/commit/2de4652c50cf40e814957282cf59941a53d06aa8))
* **cli:** add info and audit ([0ad3adc](https://github.com/kirchDev/gitignore-sync/commit/0ad3adc86ebfc78670153ba00d3a6b2e5c5a833e))
* **cli:** add init, edit, add, remove, sync, check and list ([43aebf1](https://github.com/kirchDev/gitignore-sync/commit/43aebf1f5c996490eeeb01e08d916fbb02b47f28))
* **detect:** fingerprint stacks from the repo and the machine ([3aa1620](https://github.com/kirchDev/gitignore-sync/commit/3aa1620311c0546e6a0c527f716f1ad3ec115ad1))
* **gitignore:** parse, render and reconcile the managed region ([0ef82b5](https://github.com/kirchDev/gitignore-sync/commit/0ef82b5d5ee8ca00c1ce77149a6b76e7f28bfbdc))
* **templates:** add the curated stack blocks with version history ([aef5f44](https://github.com/kirchDev/gitignore-sync/commit/aef5f44ab7b7801f66487d176d5798acdbb54607))


### Bug Fixes

* **ci:** read the Queue App PEM from this owner's own -ci mirror ([167dcef](https://github.com/kirchDev/gitignore-sync/commit/167dcef746411159477590898198bec896720355))
* **ci:** read the Release App PEM from this owner's own -ci mirror ([dd59e0b](https://github.com/kirchDev/gitignore-sync/commit/dd59e0bb8ae14f0aebf2542adc0bfa0f51bcf56c))
* publish under the [@kirchdev](https://github.com/kirchdev) scope ([900f1b0](https://github.com/kirchDev/gitignore-sync/commit/900f1b01a8233d590ea7e7393093057ce2bfddad))
* **release:** start the version history at 0.1.0 ([dff4e88](https://github.com/kirchDev/gitignore-sync/commit/dff4e88cbc21e7f6a58549416c2d964bade57166))
