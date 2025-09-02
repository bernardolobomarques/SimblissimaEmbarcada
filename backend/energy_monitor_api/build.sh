#!/usr/bin/env bash
# build.sh - Script de build para o Render

set -o errexit  # exit on error

# Instalar dependências do sistema se necessário
if command -v apt-get > /dev/null; then
    apt-get update
    apt-get install -y libpq-dev python3-dev
fi

# Instalar dependências Python
pip install --upgrade pip
pip install -r requirements.txt

# Coletar arquivos estáticos e migrar
python manage.py collectstatic --no-input
python manage.py migrate
