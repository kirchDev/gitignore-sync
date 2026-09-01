# Changelog

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
