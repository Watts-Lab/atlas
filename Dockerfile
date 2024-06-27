# Build step #1: build the React front end
FROM node:18-alpine as build-step
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build step #2: build the API with the client as static files
FROM python:3.9
WORKDIR /app
COPY --from=build-step /app/dist ./build

RUN mkdir ./api
COPY server ./api
RUN pip install -r ./api/requirements.txt
RUN pip install gunicorn
ENV FLASK_ENV production


EXPOSE 8000
WORKDIR /app/api
CMD ["gunicorn", "-b", ":8000", "api:app"]