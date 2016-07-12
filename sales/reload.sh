#!/bin/sh

# if we fire SIGHUP vs node before it has a chance to register the
# signal handler, then it will immediately exit. This ensures that
# the process is listening on port 3000 which should only be the
# case after we have the signal handler loaded.
while :
do
    netstat | grep -q 3000 && pkill -SIGHUP node && break
done
