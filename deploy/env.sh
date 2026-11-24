#!/usr/bin/env bash
# Maps an environment name to where it lives on the server. Sourced by deploy.sh,
# ci-entry.sh and backup.sh, so the two environments are described in one place.
#
#   prod -> branch main -> https://topcollegepath.com      (checkout /opt/career-platform)
#   dev  -> branch dev  -> https://dev.topcollegepath.com  (checkout /opt/career-platform-dev)
#
# The prod project keeps the name "career-platform" on purpose: Docker names its volumes after
# the project, so a different name would start prod on an empty database.

select_env() {
  case "${1:-}" in
    prod)
      APP_ENV=prod
      BRANCH=main
      REPO=/opt/career-platform
      PROJECT=career-platform
      ;;
    dev)
      APP_ENV=dev
      BRANCH=dev
      REPO=/opt/career-platform-dev
      PROJECT=career-dev
      ;;
    *)
      echo "environment must be 'prod' or 'dev' (got '${1:-}')" >&2
      return 2
      ;;
  esac
  export APP_ENV BRANCH REPO PROJECT
}
