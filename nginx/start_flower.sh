#!/bin/sh

until timeout 5s celery -A workers.celery_config.celery inspect ping; do
    echo >&2 "Celery workers not available"
done

echo 'Starting flower'
celery -A workers.celery_config.celery flower --port=5555
