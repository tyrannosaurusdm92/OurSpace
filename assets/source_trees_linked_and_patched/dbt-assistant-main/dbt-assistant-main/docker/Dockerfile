FROM ruby:2.7-alpine AS dev
COPY .build-deps /
RUN cat .build-deps | xargs apk add
WORKDIR /dbt_assistant
ENV BUNDLE_PATH=/bundle \
    BUNDLE_BIN=/bundle/bin \
    GEM_HOME=/bundle
ENV PATH="${BUNDLE_BIN}:${PATH}"
