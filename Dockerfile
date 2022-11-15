FROM node:18-alpine
WORKDIR /Spoke
# RUN npm install -g yarn
RUN export NODE_OPTIONS=--openssl-legacy-provider
RUN apk add --no-cache git bash chromium --repository=http://dl-cdn.alpinelinux.org/alpine/v3.10/main
COPY . .
COPY package.json ./
RUN export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN export PUPPETEER_EXECUTABLE_PATH=`which chromium`
# RUN npm install -g puppeteer
RUN yarn install 

EXPOSE 9090
# CMD ["/bin/bash"]
CMD ["yarn", "start"]