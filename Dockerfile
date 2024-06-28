# Build step #1: build the React front end
FROM --platform=linux/amd64 public.ecr.aws/bitnami/node:20 as build-step
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ENV NODE_ENV production
RUN npm run build

# Build step #2: build the API with the client as static files
FROM public.ecr.aws/docker/library/python:3.10
WORKDIR /app
COPY --from=build-step /app/dist ./build

RUN mkdir ./api
COPY server ./api
RUN pip install -r ./api/requirements.txt
RUN pip install gunicorn
ENV FLASK_ENV production

EXPOSE 80
WORKDIR /app/api
CMD ["gunicorn", "-b", ":80", "api:app"]