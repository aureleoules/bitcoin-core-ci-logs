#!/bin/sh

results=$(grep -ra "$1" logs | sort | uniq)

# empty list 
ids=()

while read -r line; do
    filename=$(echo "$line" | cut -d: -f1)
    task_id=$(basename $(dirname "$filename"))

    if [[ ! " ${ids[@]} " =~ " ${task_id} " ]]; then
        ids+=("$task_id")
    else 
        continue
    fi
    
    line_number=$(echo "$line" | cut -d: -f2)
    year=$(echo "$line" | cut -d '/' -f 2)
    month=$(echo "$line" | cut -d '/' -f 3)
    day=$(echo "$line" | cut -d '/' -f 4)
    
    echo -e "\e[34mFound match: $year-$month-$day - https://cirrus-ci.com/task/$task_id\e[0m"
    echo "Log: $line_number" | xargs
    echo ""

done <<< "$results"
