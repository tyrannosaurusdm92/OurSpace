dc=docker-compose -f docker-compose.yml $(1)
dc-run=$(call dc, run --rm web $(1))

usage:
	@echo "Available targets:"
	@echo "  * setup        		  - Initiates everything (building images, installing gems, creating db and migrating"
	@echo "  * build        		  - Build image"
	@echo "  * bundle       		  - Install missing gems"
	@echo "  * db-migrate   		  - Runs the migrations for dev database"
	@echo "  * db-test-migrate    - Runs the migrations for test database"
	@echo "  * dev          		  - Fires a shell inside your container"
	@echo "  * up           		  - Runs the development server"
	@echo "  * tear-down    		  - Removes all the containers and tears down the setup"
	@echo "  * stop         		  - Stops the server"
	@echo "  * test         		  - Runs tests"
	@echo "  * console         		- Fires up hanami console"

# With db
setup: build bundle db-prepare db-test-prepare

build:
	$(call dc, build)
bundle:
	$(call dc-run, bundle install)
dev:
	$(call dc-run, ash)
up:
	$(call dc, up)
tear-down:
	$(call dc, down)
stop:
	$(call dc, stop)
db-prepare:
	$(call dc-run, bundle exec hanami db prepare)
db-test-prepare:
	$(call dc, run --rm -e HANAMI_ENV=test web bundle exec hanami db prepare)
test:
	$(call dc-run, bundle exec rspec)
console:
	$(call dc-run, bundle exec hanami console)

