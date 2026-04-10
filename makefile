DEV_COMPOSE=docker-compose.yml

# Development commands

build-dev:
	docker-compose -f $(DEV_COMPOSE) up --build backend frontend

run-dev:
	docker-compose up -d

port-backend:
	docker-compose -f $(DEV_COMPOSE) run --service-ports backend

port-frontend:
	docker-compose -f $(DEV_COMPOSE) run --service-ports frontend

ALL_CONTAINERS = $$(sudo docker ps -a -q)

ALL_IMAGES = $$(sudo docker images -q)

# Stop Containers
stop-all:
	sudo docker stop $(ALL_CONTAINERS)

# Remove Containers
rm-all:
	sudo docker rm $(ALL_CONTAINERS)

# Remove Images
rm-images:
	sudo docker rmi $(ALL_IMAGES)

# Prune Containers
prune-all:
	sudo docker system prune &&\
	sudo docker system prune --volumes

# Container access

ssh-backend:
	docker exec -it backend bash