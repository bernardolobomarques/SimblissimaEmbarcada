#!/usr/bin/env bash
# build.sh - Script de build para o Render

set -o errexit  # exit on error

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate
