#!/usr/bin/env bash
# One-time installer for the auto-deploy timer. Run on the server:
#   sudo bash /opt/career-platform/deploy/install-auto-deploy.sh
# After this, every push to main reaches the server on its own within a minute.

set -euo pipefail

REPO=/opt/career-platform
RUN_AS=ubuntu

chmod +x "$REPO/deploy/auto-deploy.sh"

cat > /etc/systemd/system/career-deploy.service <<EOF
[Unit]
Description=Career Platform: pull and deploy origin/main
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=$RUN_AS
WorkingDirectory=$REPO
ExecStart=$REPO/deploy/auto-deploy.sh
EOF

cat > /etc/systemd/system/career-deploy.timer <<EOF
[Unit]
Description=Check GitHub for new commits every minute

[Timer]
OnBootSec=2min
OnUnitInactiveSec=60s
Unit=career-deploy.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now career-deploy.timer

echo
echo "Auto-deploy is on. Useful commands:"
echo "  systemctl list-timers career-deploy.timer     # next run"
echo "  journalctl -u career-deploy -n 50 --no-pager  # what it did"
echo "  cat $REPO/deploy/last-deploy.txt              # last result"
