# Claude Dev Container - Base Image
# Ubuntu 22.04 with Python 3.11, Node.js 20, and common dev tools
#
# This container is used as the execution environment for Claude CLI
# when working on project beads.

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Set locale
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# =============================================================================
# Base system packages
# =============================================================================

RUN apt-get update && apt-get install -y \
    # Essential build tools
    build-essential \
    git \
    curl \
    wget \
    # SSL and certificates
    ca-certificates \
    openssl \
    # SSH for git operations
    openssh-client \
    # Common utilities
    tree \
    vim \
    less \
    jq \
    # Python 3.11
    python3.11 \
    python3.11-venv \
    python3-pip \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# =============================================================================
# Node.js 20 LTS
# =============================================================================

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# Global development tools
# =============================================================================

# Node.js package managers and tools
RUN npm install -g \
    yarn \
    pnpm \
    typescript \
    ts-node

# Python development tools
RUN pip3 install --no-cache-dir \
    pytest \
    pytest-asyncio \
    black \
    ruff \
    httpx

# GitHub CLI for PR operations
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# Claude user setup
# =============================================================================

# Create claude user with sudo access
RUN useradd -m -s /bin/bash claude \
    && echo "claude ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set up git config for claude user
RUN mkdir -p /home/claude/.ssh \
    && chown -R claude:claude /home/claude/.ssh \
    && chmod 700 /home/claude/.ssh

# =============================================================================
# Healthcheck
# =============================================================================

COPY scripts/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# =============================================================================
# Runtime configuration
# =============================================================================

# Switch to claude user
USER claude
WORKDIR /workspace

# Keep container running
CMD ["tail", "-f", "/dev/null"]
