# node-red-contrib-udpdnserver

This is a fully formed UDP Node-Red node that provides a caching DNS Server.

The Node uses an alaSQL in memory database that can store and then cache requests to significantly speed up local server requests, for example requests can go from 350ms to 8ms when cached.

Cache values (on a per domain basis) for time to live (TTL) are in seconds, after that it deletes the entry(s) and starts learning again.

The Cache learning algorythm (LTTL) is in seconds, it allows (on a per domain basis) the ability to learn about multiple addresses or requests, for example, if the LTTL is set to 60, and multiple command line "nslookup www.google.com" requests are performed by the user, then all of the addresses received by the cache are randomly send back to the user on susequent cached requests, this is done until the domain TTL has expired and it then flushed the RR cache and the learning is started again.

Note all RR types are intercepted and then made available to the cache,user's can decide tofurther process them in their own Node-Red processes and/or cache.

One designed capabilty is that the Node is programmable in the Node-Red builder, it allows users to add alaSQL SQL/Javascript functions and tables - functionality to extend the Node.

The first output is from the decision engine eg: if the result is from the cache or from the upstream DNS resolver, you can add as many upstream resolvers as you like, a random selection is applied select an upstream DNS resolver.

Another capability that it has, is it allows tracking domains that requests have gone to, also, it tracks the calling address and ports the requests originated from, this is provided by the second output.

Note that the input and third output are requests and responces to alaSQL and allow you to easily extend the Node.

