#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BIN_DIR="${ROOT_DIR}/.meta/.tools/ci-bin"
TMP_DIR="${ROOT_DIR}/.meta/.tools/ci-tmp"

GITLEAKS_VERSION="${GITLEAKS_VERSION:-8.24.2}"
GRYPE_VERSION="${GRYPE_VERSION:-0.80.1}"
OSV_SCANNER_VERSION="${OSV_SCANNER_VERSION:-2.1.0}"
SYFT_VERSION="${SYFT_VERSION:-1.20.0}"
TERRAFORM_VERSION="${TERRAFORM_VERSION:-1.6.6}"
TFLINT_VERSION="${TFLINT_VERSION:-0.50.3}"

mkdir -p "${BIN_DIR}" "${TMP_DIR}"

prepend_path() {
  case ":${PATH}:" in
    *":${BIN_DIR}:"*) ;;
    *) export PATH="${BIN_DIR}:${PATH}" ;;
  esac

  if [[ -n "${GITHUB_PATH:-}" ]]; then
    printf '%s\n' "${BIN_DIR}" >>"${GITHUB_PATH}"
  fi
}

download() {
  local url="$1"
  local output_path="$2"
  curl --fail --location --silent --show-error "$url" --output "$output_path"
}

install_tar_binary() {
  local tool_name="$1"
  local version="$2"
  local url="$3"
  local binary_path_inside_archive="$4"
  local archive_path="${TMP_DIR}/${tool_name}-${version}.tar.gz"
  local extract_dir="${TMP_DIR}/${tool_name}-${version}"

  if command -v "${tool_name}" >/dev/null 2>&1; then
    return 0
  fi

  rm -rf "${extract_dir}"
  mkdir -p "${extract_dir}"
  download "$url" "${archive_path}"
  tar -xzf "${archive_path}" -C "${extract_dir}"
  install -m 0755 "${extract_dir}/${binary_path_inside_archive}" "${BIN_DIR}/${tool_name}"
}

install_zip_binary() {
  local tool_name="$1"
  local version="$2"
  local url="$3"
  local binary_path_inside_archive="$4"
  local archive_path="${TMP_DIR}/${tool_name}-${version}.zip"
  local extract_dir="${TMP_DIR}/${tool_name}-${version}"

  if command -v "${tool_name}" >/dev/null 2>&1; then
    return 0
  fi

  rm -rf "${extract_dir}"
  mkdir -p "${extract_dir}"
  download "$url" "${archive_path}"
  unzip -q "${archive_path}" -d "${extract_dir}"
  install -m 0755 "${extract_dir}/${binary_path_inside_archive}" "${BIN_DIR}/${tool_name}"
}

install_direct_binary() {
  local tool_name="$1"
  local version="$2"
  local url="$3"
  local output_path="${TMP_DIR}/${tool_name}-${version}"

  if command -v "${tool_name}" >/dev/null 2>&1; then
    return 0
  fi

  download "$url" "${output_path}"
  install -m 0755 "${output_path}" "${BIN_DIR}/${tool_name}"
}

install_uv_tool() {
  local tool_name="$1"

  if command -v "${tool_name}" >/dev/null 2>&1; then
    return 0
  fi

  UV_TOOL_BIN_DIR="${BIN_DIR}" uv tool install "${tool_name}"
}

prepend_path

install_uv_tool checkov

install_tar_binary \
  "gitleaks" \
  "${GITLEAKS_VERSION}" \
  "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
  "gitleaks"

install_tar_binary \
  "syft" \
  "${SYFT_VERSION}" \
  "https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/syft_${SYFT_VERSION}_linux_amd64.tar.gz" \
  "syft"

install_tar_binary \
  "grype" \
  "${GRYPE_VERSION}" \
  "https://github.com/anchore/grype/releases/download/v${GRYPE_VERSION}/grype_${GRYPE_VERSION}_linux_amd64.tar.gz" \
  "grype"

install_direct_binary \
  "osv-scanner" \
  "${OSV_SCANNER_VERSION}" \
  "https://github.com/google/osv-scanner/releases/download/v${OSV_SCANNER_VERSION}/osv-scanner_linux_amd64"

install_zip_binary \
  "terraform" \
  "${TERRAFORM_VERSION}" \
  "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" \
  "terraform"

install_zip_binary \
  "tflint" \
  "${TFLINT_VERSION}" \
  "https://github.com/terraform-linters/tflint/releases/download/v${TFLINT_VERSION}/tflint_linux_amd64.zip" \
  "tflint"

echo "[ci-toolchain] Ready:"
printf '  - %s\n' \
  "$(command -v checkov)" \
  "$(command -v gitleaks)" \
  "$(command -v syft)" \
  "$(command -v grype)" \
  "$(command -v osv-scanner)" \
  "$(command -v terraform)" \
  "$(command -v tflint)"
