const openTracing = require('opentracing');
const initJaegerTracer = require('jaeger-client').initTracerFromEnv;

function initTracer(serviceName) {
    const config = {
        serviceName,
        sampler: {
            type: 'const',
            param: 1,
        },
    };

    return initJaegerTracer(config);
}

exports.init = (serviceName) => {
    return openTracing.initGlobalTracer(initTracer(serviceName));
};

exports.getGlobalTracer = () => {
    return openTracing.globalTracer();
};

