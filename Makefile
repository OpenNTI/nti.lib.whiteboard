.PHONY: clean check test

LIBDIR = lib

all: node_modules lib

node_modules: package.json
	@rm -rf node_modules
	@npm install
	@touch $@

check:
	@eslint --ext .js,.jsx ./src

test: node_modules check
	@karma start --single-run

clean:
	@rm -rf $(LIBDIR)

lib: clean
	@NODE_ENV=rollup rollup -c
