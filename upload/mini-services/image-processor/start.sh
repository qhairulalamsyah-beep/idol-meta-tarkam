#!/bin/bash
cd "$(dirname "$0")"
/home/z/.local/bin/uvicorn main:app --host 0.0.0.0 --port 5005 --reload
