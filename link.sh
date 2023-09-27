# this file is used for local development
# it links the syntest-core libraries to the syntest-javascript libraries

rm -rf node_modules/@syntest/analysis
rm -rf node_modules/@syntest/base-language
rm -rf node_modules/@syntest/cfg
rm -rf node_modules/@syntest/cli
rm -rf node_modules/@syntest/cli-graphics
rm -rf node_modules/@syntest/search
rm -rf node_modules/@syntest/logging
rm -rf node_modules/@syntest/metric
rm -rf node_modules/@syntest/module
rm -rf node_modules/@syntest/storage
rm -rf node_modules/@syntest/prng

cd node_modules/@syntest

ln -s ../../../syntest-core/libraries/analysis analysis
ln -s ../../../syntest-core/libraries/cfg cfg
ln -s ../../../syntest-core/libraries/cli-graphics cli-graphics
ln -s ../../../syntest-core/libraries/logging logging
ln -s ../../../syntest-core/libraries/metric metric
ln -s ../../../syntest-core/libraries/module module
ln -s ../../../syntest-core/libraries/search search
ln -s ../../../syntest-core/libraries/storage storage
ln -s ../../../syntest-core/libraries/prng prng

ln -s ../../../syntest-core/tools/cli cli
ln -s ../../../syntest-core/tools/base-language base-language

