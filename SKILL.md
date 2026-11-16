---
name: integration-test-generator
description: Generates Spring Boot integration tests for all layers (Controller, Service, DAO/Repository, Client, Event). Multi-phase pipeline covering codebase discovery, gap analysis, test generation with WireMock + @MockBean (including DAO mocking in service tests), JaCoCo coverage reporting. Comprehensive positive and negative scenario coverage including null inputs, edge cases, error codes (400/401/403/404/409/500), idempotency, caching, partial failure, event deduplication, and end-to-end failure flows. All negative scenarios use conditional generation based on source code annotations. Use when the user asks to generate integration tests, add test coverage, create Spring Boot tests, or improve test coverage for a Java/Spring project.
version: 1.2.0
disable-model-invocation: true
allowed-tools:
 - Read
 - Grep
 - Glob
 - Write
 - Edit
 - Bash
 - Agent
---


# Integration Test Generator


## Version
1.2.0


## Phase 1: Codebase Discovery


Before writing any test, perform a thorough analysis of the target codebase.
Launch up to 3 Explore agents in parallel to scan concurrently — only parallelize
if the project has more than 30 source files; otherwise a single Explore agent is sufficient.


### 1.1 Identify Project Coordinates


```bash
# Find the root pom.xml or build.gradle
find . -maxdepth 2 -name "pom.xml" -o -name "build.gradle" | head -5
```


Read the build file to extract:
- groupId, artifactId
- Spring Boot version
- Java version
- Existing test dependencies (JUnit, Mockito, Karate, WireMock, Testcontainers)
- Base package name


Extract and note:
- Base package: e.g., `com.intuit.v4.datagoverncompliance.dgdataclassifyapp`
- Spring Boot version: e.g., 2.7.18
- Java version: e.g., 21
- Existing test framework: JUnit 4, JUnit 5, or both
- WireMock version selection based on Spring Boot version:
 - Spring Boot 3.x → wiremock-standalone:3.3.1
 - Spring Boot 2.7.x → wiremock-standalone:2.35.1
 - Spring Boot 2.x (< 2.7) → wiremock-standalone:2.27.2


### 1.2 Map Application Layers


Scan for all Java source files and classify them into layers:


```bash
# Controllers
find app/src/main/java -type f -name "*Controller*.java"
# Services
find app/src/main/java -type f -name "*Service*.java" -o -name "*UseCase*.java"
# Repositories / DAOs
find app/src/main/java -type f -name "*Repository*.java" -o -name "*Dao*.java"
# Entities
find app/src/main/java -type f -name "*Entity*.java"
# External clients (HTTP, gRPC, GraphQL)
find app/src/main/java -type f -name "*Client*.java" -o -name "*Feign*.java"
# Event producers/consumers (Kafka, EventBus)
find app/src/main/java -type f -name "*Producer*.java" -o -name "*Consumer*.java" -o -name "*Listener*.java" -o -name "*Sink*.java"
# Configuration classes
find app/src/main/java -type f -name "*Configuration*.java" -o -name "*Config*.java" -o -name "*Properties*.java"
# Exception handlers
find app/src/main/java -type f -name "*ExceptionHandler*.java" -o -name "*ControllerAdvice*.java"
# Mappers (MapStruct, manual)
find app/src/main/java -type f -name "*Mapper*.java"
```


Why scan Entities, Config, Mappers and Exception Handlers? These are NOT tested directly. They are scanned purely as metadata:
- Entities → used to generate accurate TestDataBuilder factory methods with real field names
- Config classes → reveals what beans exist (to know what to @MockBean) and external service URLs (to override in application-integration-test.yml)
- Exception handlers → reveals which exceptions map to which HTTP status codes, enabling accurate _returns404, _returns500 test scenario generation
- Mappers → reveals DTO field shapes for accurate assertion statements in tests


### 1.3 Read Key Files


For each layer, read 2–3 representative files to understand:
- Constructor injection patterns (are they using @RequiredArgsConstructor?)
- HTTP method annotations (@GetMapping, @PostMapping, etc.)
- Request/response DTOs and validation annotations
- Exception handling patterns
- Async patterns (@Async, CompletableFuture)
- Security annotations (@PreAuthorize, custom auth)
- Persistence patterns (JPA, IDP SDK, custom DAOs)
- External client patterns (WebClient, RestTemplate, Feign, GraphQL)


### 1.4 Read Configuration


```bash
# Application config
find app/src/main/resources -name "application*.yml" -o -name "application*.yaml" -o -name "application*.properties"
# Bootstrap config
find app/src/main/resources -name "bootstrap*.yml" -o -name "bootstrap*.yaml"
```


Note:
- Server port and TLS settings
- External service URLs and credentials
- Database/persistence configuration
- Kafka/EventBus topics
- Feature flag configuration
- Profile-specific overrides


### 1.5 Check Existing Tests and Detect Coverage Gaps


```bash
find app/src/test/java -type f -name "*.java" | head -50
find app/src/test/java -type d | head -30
```


Gap Detection — this is mandatory, not optional.


For every layer identified in Phase 1.2, cross-reference against existing test files to determine
which classes already have integration test coverage and which do not.


Build a gap matrix:


| Layer | Source Class | Integration Test Exists? | Action |
|---|---|---|---|
| Service | UserService.java | Yes — UserServiceIntegrationTest.java | Skip |
| Service | PaymentService.java | No | Generate |
| DAO/Repository | UserRepository.java | No | Generate |
| DAO/Repository | AuditDao.java | Yes — AuditDaoIntegrationTest.java | Skip |
| Controller | OrderController.java | No | Generate |
| Client | NotificationClient | Yes | Skip |
| Event | PaymentProducer.java | No | Generate |


Rules for gap detection:
- A class is considered covered if a test file exists whose name contains the source class name
 (e.g., PaymentService → look for *PaymentService*IntegrationTest* or *PaymentServiceIT*)
- Do not count unit tests (files in a unit/ package or named *Test.java without Integration) as integration coverage
- If a layer has SOME classes covered but not all, generate tests only for the uncovered classes — do not regenerate existing ones
- Print the full gap matrix to the user before proceeding to Phase 2


Example output before proceeding:


```
Coverage Gap Analysis
─────────────────────────────────────────────────────
Layer        Source Class              Status
─────────────────────────────────────────────────────
Service      UserService               COVERED — skip
Service      PaymentService            MISSING — will generate
DAO          UserRepository            MISSING — will generate
DAO          AuditDao                  COVERED — skip
Controller   OrderController           MISSING — will generate
Client       NotificationClient        COVERED — skip
Event        PaymentProducer           MISSING — will generate
─────────────────────────────────────────────────────
Generating tests for: PaymentService, UserRepository, OrderController, PaymentProducer
```


---


## Phase 2: Create the Integration Test Package


### 2.1 Package Structure


Create the integration test package at:
`app/src/test/java/<base-package>/integration/`


Organize by test category:


```
integration/
├── IntegrationTestBase.java
├── config/
│   └── IntegrationTestConfig.java
├── api/
│   ├── <Domain>ApiIntegrationTest.java
│   └── ...
├── service/
│   ├── <Domain>ServiceIntegrationTest.java
│   └── ...
├── persistence/
│   ├── <Domain>PersistenceIntegrationTest.java
│   └── ...
├── client/
│   ├── <ClientName>IntegrationTest.java
│   └── ...
├── event/
│   ├── <EventComponent>IntegrationTest.java
│   └── ...
└── util/
   ├── TestDataBuilder.java
   └── WireMockStubs.java
```


Only generate directories for layers that have gaps.


### 2.2 Test Configuration File


Create `app/src/test/resources/application-integration-test.yml`:


```yaml
spring:
 profiles:
   active: integration-test
 main:
   allow-bean-definition-overriding: true
   use-legacy-processing: true
server:
 port: 0
 ssl:
   enabled: false
management:
 server:
   port: 0
   ssl:
     enabled: false
```


For each external service URL found in the main config, override it to point to localhost
with WireMock ports or disable it.


### 2.3 Maven/Gradle Configuration


Add to `app/pom.xml` under `<dependencies>` (only if not already present):


```xml
<!-- Integration Test Dependencies -->
<dependency>
   <groupId>org.springframework.boot</groupId>
   <artifactId>spring-boot-starter-test</artifactId>
   <scope>test</scope>
</dependency>
<dependency>
   <groupId>org.wiremock</groupId>
   <artifactId>wiremock-standalone</artifactId>
   <!-- Version selected based on Spring Boot version detected in Phase 1.1 -->
   <version>${wiremock.version}</version>
   <scope>test</scope>
</dependency>
<!-- Add only if persistence tests are being generated AND h2 is not already present -->
<dependency>
   <groupId>com.h2database</groupId>
   <artifactId>h2</artifactId>
   <scope>test</scope>
</dependency>
<!-- Add only if @PreAuthorize or security annotations are present in controllers -->
<dependency>
   <groupId>org.springframework.security</groupId>
   <artifactId>spring-security-test</artifactId>
   <scope>test</scope>
</dependency>
<!-- Add only if JaCoCo is not already present -->
<dependency>
   <groupId>org.jacoco</groupId>
   <artifactId>jacoco-maven-plugin</artifactId>
   <version>0.8.11</version>
   <scope>test</scope>
</dependency>
```


Add to `<build><plugins>` (only if not already present):


```xml
<!-- Failsafe plugin for integration tests -->
<plugin>
   <groupId>org.apache.maven.plugins</groupId>
   <artifactId>maven-failsafe-plugin</artifactId>
   <configuration>
       <includes>
           <include>**/*IntegrationTest.java</include>
           <include>**/*IT.java</include>
       </includes>
       <systemPropertyVariables>
           <spring.profiles.active>integration-test,mock</spring.profiles.active>
       </systemPropertyVariables>
   </configuration>
   <executions>
       <execution>
           <goals>
               <goal>integration-test</goal>
               <goal>verify</goal>
           </goals>
       </execution>
   </executions>
</plugin>


<!-- JaCoCo plugin for test coverage reporting -->
<plugin>
   <groupId>org.jacoco</groupId>
   <artifactId>jacoco-maven-plugin</artifactId>
   <version>0.8.11</version>
   <executions>
       <execution>
           <id>prepare-agent</id>
           <goals><goal>prepare-agent</goal></goals>
       </execution>
       <execution>
           <id>prepare-agent-integration</id>
           <goals><goal>prepare-agent-integration</goal></goals>
       </execution>
       <execution>
           <id>merge-results</id>
           <phase>verify</phase>
           <goals><goal>merge</goal></goals>
           <configuration>
               <fileSets>
                   <fileSet>
                       <directory>${project.build.directory}</directory>
                       <includes><include>*.exec</include></includes>
                   </fileSet>
               </fileSets>
               <destFile>${project.build.directory}/jacoco-merged.exec</destFile>
           </configuration>
       </execution>
       <execution>
           <id>report-merged</id>
           <phase>verify</phase>
           <goals><goal>report</goal></goals>
           <configuration>
               <dataFile>${project.build.directory}/jacoco-merged.exec</dataFile>
               <outputDirectory>${project.reporting.outputDirectory}/jacoco-merged</outputDirectory>
           </configuration>
       </execution>
   </executions>
</plugin>
```


---


## Phase 3: Write Integration Tests


Only generate test classes for layers identified as MISSING in the Phase 1.5 gap matrix.
Never overwrite or modify existing test files.


### 3.1 Base Test Class


Every integration test extends this base class:


```java
@SpringBootTest(
   webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
   properties = {"spring.profiles.active=integration-test,mock"}
)
@ActiveProfiles({"integration-test", "mock"})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public abstract class IntegrationTestBase {
   @Autowired
   protected TestRestTemplate restTemplate;


   @LocalServerPort
   protected int port;


   protected String baseUrl() {
       return "http://localhost:" + port;
   }
}
```


If the project uses TLS on its main port, the base class must configure TestRestTemplate to
skip SSL verification or use WebEnvironment.RANDOM_PORT with SSL disabled in the test profile.


### 3.2 API Integration Tests (per Controller)


For EACH controller found to be MISSING coverage in Phase 1.5:


```java
class <ControllerName>IntegrationTest extends IntegrationTestBase {
   // @MockBean for external dependencies that the controller's service layer calls


   @Test
   void <endpoint>_happyPath_returns200() {
       // Build request with valid input
       // Call endpoint via restTemplate
       // Assert HTTP status
       // Assert response body structure and key fields
   }


   @Test
   void <endpoint>_invalidInput_returns400() {
       // Build request with missing/invalid required fields
       // Call endpoint
       // Assert 400 with error message
   }


   @Test
   void <endpoint>_notFound_returns404() {
       // Mock underlying service to return empty/null
       // Call endpoint
       // Assert 404
   }


   @Test
   void <endpoint>_serviceError_returns500() {
       // Mock underlying service to throw exception
       // Call endpoint
       // Assert 500 with generic error
   }


   @Test
   void <endpoint>_unauthorized_returns401() {
       // Only generate if controller has @PreAuthorize or security annotations
       // Send request without auth token or with expired/invalid token
       // Assert 401 Unauthorized
   }


   @Test
   void <endpoint>_forbidden_returns403() {
       // Only generate if controller has role-based @PreAuthorize
       // Send request with valid auth but insufficient role/permission
       // Assert 403 Forbidden
   }


   @Test
   void <endpoint>_conflict_returns409() {
       // Only generate if endpoint performs create/update with uniqueness constraints
       // Mock service to throw DuplicateKeyException or ConflictException
       // Assert 409 Conflict with meaningful error message
   }


   @Test
   void <endpoint>_methodNotAllowed_returns405() {
       // Send request with wrong HTTP method (e.g., POST to a GET-only endpoint)
       // Assert 405 Method Not Allowed
   }


   @Test
   void <endpoint>_emptyCollection_returns200WithEmptyList() {
       // Only generate for GET list/search endpoints
       // Mock service to return empty collection
       // Assert 200 with empty array [] — NOT null, NOT 404
   }
}
```


Rules for API tests:
- Read each controller's @RequestMapping, method annotations, path variables, query params, and request bodies
- Test every HTTP method on every endpoint
- For POST/PUT/PATCH: test with valid body, empty body, missing required fields, invalid field values
- For GET with path variables: test with valid IDs, non-existent IDs
- For GET with query params: test with all params, missing optional params, invalid param values
- For paginated endpoints: test default pagination, custom page/size, boundary values
- For file upload endpoints (@RequestParam MultipartFile): test with valid file, oversized file, wrong content type
- For endpoints with @PreAuthorize or security annotations: test 401 (missing/invalid token) and 403 (wrong role).
  Only generate 401/403 tests if security annotations are present on the controller.
- For create/update endpoints with uniqueness constraints: test 409 Conflict.
  Only generate if the service layer has duplicate-checking or uniqueness constraints.
- For list/search endpoints: test empty result set returns 200 with [] (not 404 or null)
- For endpoints that accept specific Content-Type: test 415 Unsupported Media Type by sending wrong Content-Type header
- Test 405 Method Not Allowed by calling at least one endpoint with the wrong HTTP verb
- Use @MockBean to mock the service layer's external dependencies (not the service itself)
- Validate response headers (Content-Type, pagination headers) where applicable
- Test @ControllerAdvice exception handling by triggering each mapped exception


### 3.3 Service Integration Tests (per Service)


For EACH service class found to be MISSING coverage in Phase 1.5:


```java
@SpringBootTest(properties = {"spring.profiles.active=integration-test,mock"})
@ActiveProfiles({"integration-test", "mock"})
class <ServiceName>IntegrationTest {


   @Autowired
   private <ServiceInterface> service;


   // Mock ALL downstream dependencies: DAOs, Repositories, HTTP clients, AWS, Kafka
   @MockBean
   private <DaoOrRepositoryClass> dao;


   @MockBean
   private <ExternalHttpClient> httpClient;


   @MockBean
   private <KafkaProducer> kafkaProducer;


   @Test
   void <method>_withValidInput_succeeds() {
       // Arrange: stub dao and external dep responses
       when(dao.findById(any())).thenReturn(Optional.of(TestDataBuilder.buildEntity()));
       when(httpClient.call(any())).thenReturn(TestDataBuilder.buildResponse());


       // Act
       var result = service.method(validInput);


       // Assert return value
       assertThat(result).isNotNull();
       assertThat(result.getSomeField()).isEqualTo("expected-value");


       // Assert DAO interactions
       verify(dao).findById(expectedId);
       verify(dao).save(argThat(entity -> entity.getField().equals("expected")));
   }


   @Test
   void <method>_withInvalidInput_throwsExpectedException() {
       when(dao.findById(any())).thenReturn(Optional.empty());


       assertThrows(ResourceNotFoundException.class, () -> service.method(invalidInput));


       verify(dao, never()).save(any());
   }


   @Test
   void <method>_whenDaoFails_propagatesException() {
       when(dao.findById(any())).thenThrow(new DataAccessException("DB error") {});


       assertThrows(DataAccessException.class, () -> service.method(validInput));
   }


   @Test
   void <method>_whenExternalServiceFails_handlesGracefully() {
       when(dao.findById(any())).thenReturn(Optional.of(TestDataBuilder.buildEntity()));
       when(httpClient.call(any())).thenThrow(new RuntimeException("Service down"));


       // Verify retry behavior or fallback
   }


   @Test
   void <method>_withNullInput_throwsIllegalArgumentOrNPE() {
       // Pass null for required parameters
       // Assert IllegalArgumentException, NullPointerException, or project-specific validation exception
   }


   @Test
   void <method>_withEdgeCaseInput_handlesGracefully() {
       // Test boundary values: empty strings, zero, negative numbers, max-length strings,
       // empty collections, single-element collections
       // Assert correct behavior — either succeeds with defaults or throws validation exception
   }


   @Test
   void <method>_idempotent_duplicateCallReturnsSameResult() {
       // Only generate for create/update methods where idempotency is expected
       // Stub DAO to return existing entity on second call
       // Call method twice with identical input
       // Assert same result both times, verify DAO save called only once (or is idempotent)
   }


   @Test
   void <method>_whenCached_doesNotCallDaoOnSecondInvocation() {
       // Only generate if method has @Cacheable annotation
       // Stub DAO, call method twice
       // verify(dao, times(1)).findById(...) — second call should hit cache
   }


   @Test
   void <method>_multiStepOrchestration_partialFailure_rollsBackOrCompensates() {
       // Only generate for methods that call multiple external deps sequentially
       // Stub first external dep to succeed, second to fail
       // Assert: either transaction rolls back, compensation action fires, or partial state is consistent
       // verify(dao, never()).save(any()) OR verify(compensationService).rollback(any())
   }
}
```


Rules for service tests:
- ALWAYS @MockBean all DAOs and Repositories — do NOT wire real persistence in service-layer tests.
 Service tests verify business logic and orchestration, not database behavior.
- Use `when(...).thenReturn(...)` to control what the mocked DAO returns for each scenario.
- Use `verify(dao).methodName(...)` to assert the service called the correct DAO method with correct arguments.
- Use `verify(dao, never()).save(any())` to assert no side-effect occurred on failure paths.
- Only @Autowired the real service under test — everything it depends on is a @MockBean.
- Mock external boundaries: HTTP clients, AWS SDK clients, Kafka producers.
- Verify both return values AND side effects (was the correct DAO method called? were events published?).
- For services with @Transactional, verify rollback behavior by having the DAO throw mid-operation.
- For services with @Async, verify async execution completes via CompletableFuture.get().
- For services with retry logic (@Retryable), test retry behavior with flaky mocks.
- For services that use feature flags, test both enabled and disabled paths.
- ALWAYS test null input for every public service method — assert the correct exception type.
- Test edge-case inputs: empty strings, zero/negative numbers, max-length values, empty collections.
  These are conditional — only generate if the method parameter types allow these edge values.
- For methods that perform create/update: test idempotency by calling twice with identical input.
  Only generate if the service has duplicate-checking or upsert logic.
- For methods with @Cacheable: test that the second invocation does NOT hit the DAO/repository.
  Only generate if @Cacheable, @CachePut, or @CacheEvict annotations are present.
- For methods that orchestrate multiple external calls sequentially: test partial failure where
  the first dependency succeeds but the second fails. Verify rollback, compensation, or consistent state.
- For methods that emit audit events or logs: verify the audit side effect using verify() or ArgumentCaptor.
  Only generate if the method explicitly publishes audit/logging events via an injected dependency.


### 3.4 Persistence Integration Tests (per DAO/Repository)


For EACH DAO or Repository class found to be MISSING coverage in Phase 1.5:


```java
@SpringBootTest(properties = {"spring.profiles.active=integration-test,mock"})
@ActiveProfiles({"integration-test", "mock"})
class <DaoName>IntegrationTest {


   @Autowired
   private <DaoClass> dao;


   @Test
   void save_and_findById_roundTrip() {
       // Create entity → Save via DAO → Retrieve by ID → Assert all fields match
   }


   @Test
   void findByCustomQuery_returnsMatchingEntities() {
       // Save multiple entities → Query with specific criteria → Assert correct subset returned
   }


   @Test
   void update_modifiesExistingEntity() {
       // Save entity → Modify field → Update via DAO → Retrieve and verify change
   }


   @Test
   void delete_removesEntity() {
       // Save entity → Delete → Verify findById returns empty/null
   }


   @Test
   void findById_nonExistent_returnsEmptyOrNull() {
       // Query with an ID that does not exist
       // Assert result is Optional.empty(), null, or empty list depending on DAO return type
   }


   @Test
   void save_duplicateKey_throwsException() {
       // Only generate if entity has unique constraints (unique index, @Column(unique=true), or business key)
       // Save entity → attempt to save another entity with same unique key
       // Assert DataIntegrityViolationException or project-specific duplicate exception
   }


   @Test
   void save_nullRequiredField_throwsException() {
       // Only generate if entity has @NotNull or @Column(nullable=false) fields
       // Build entity with required field set to null
       // Assert ConstraintViolationException, DataIntegrityViolationException, or validation error
   }


   @Test
   void findByQuery_noMatch_returnsEmptyCollection() {
       // Query with criteria that match no entities
       // Assert empty list is returned — NOT null, NOT exception
   }


   @Test
   void delete_nonExistent_doesNotThrow() {
       // Attempt to delete an entity with non-existent ID
       // Assert no exception thrown (idempotent delete) OR assert specific exception if DAO throws on missing
   }


   @Test
   void pagination_beyondLastPage_returnsEmptyPage() {
       // Only generate if DAO supports pagination
       // Save N entities → request page beyond total count
       // Assert empty page/list returned, not exception
   }


   @Test
   void bulkSave_multipleEntities_allPersisted() {
       // Only generate if DAO has bulk/batch save methods
       // Save list of entities → retrieve each → assert all present
   }
}
```


Rules for persistence tests:
- If the project uses IDP SDK (Intuit Data Platform), mock the IDP REST client and verify the correct API calls are made
- If using JPA/Hibernate with an embedded DB, configure H2 in application-integration-test.yml
- Test all custom query methods on each DAO — both with matching data AND with no matching data
- Test pagination parameters if the DAO supports them, including boundary (page beyond last)
- Test entity relationships and cascading operations
- ALWAYS test findById with a non-existent ID — this is the most common DAO negative case
- For entities with unique constraints: test duplicate key insertion. Only generate if @Column(unique=true),
  unique indexes, or business key validation exist — scan the entity class to determine this.
- For entities with @NotNull or @Column(nullable=false): test null required field rejection
- For DAOs with bulk/batch methods: test multi-entity save and retrieval
- For DAOs with delete methods: test deleting a non-existent entity (idempotency)
- Conditional generation: Only generate constraint-violation tests if the entity has the corresponding
  annotations. Do not assume constraints exist — read the entity class first.


### 3.5 External Client Integration Tests (WireMock)


For EACH external HTTP client found to be MISSING coverage in Phase 1.5:


```java
@SpringBootTest(properties = {"spring.profiles.active=integration-test,mock"})
@ActiveProfiles({"integration-test", "mock"})
@AutoConfigureWireMock(port = 0)
class <ClientName>IntegrationTest {


   @Autowired
   private <ClientClass> client;


   @Test
   void <method>_success_returnsExpectedData() {
       stubFor(get(urlPathEqualTo("/expected/path"))
           .willReturn(okJson("{...}")));
       var result = client.method(args);
       assertThat(result).isNotNull();
   }


   @Test
   void <method>_serverError_throwsExpectedException() {
       stubFor(get(urlPathEqualTo("/expected/path"))
           .willReturn(serverError()));
       assertThrows(ExpectedException.class, () -> client.method(args));
   }


   @Test
   void <method>_timeout_handlesGracefully() {
       stubFor(get(urlPathEqualTo("/expected/path"))
           .willReturn(ok().withFixedDelay(5000)));
       // Verify timeout handling
   }


   @Test
   void <method>_retryOnFailure() {
       stubFor(get(urlPathEqualTo("/expected/path"))
           .inScenario("retry")
           .whenScenarioStateIs(STARTED)
           .willReturn(serverError())
           .willSetStateTo("second-attempt"));
       stubFor(get(urlPathEqualTo("/expected/path"))
           .inScenario("retry")
           .whenScenarioStateIs("second-attempt")
           .willReturn(okJson("{...}")));
       var result = client.method(args);
       assertThat(result).isNotNull();
   }


   @Test
   void <method>_clientError_returns400_throwsClientException() {
       // Stub WireMock to return 400 Bad Request with error body
       stubFor(get(urlPathEqualTo("/expected/path"))
           .willReturn(badRequest().withBody("{\"error\":\"invalid request\"}")));
       // Assert client throws appropriate exception (not silently swallowed)
       assertThrows(ClientException.class, () -> client.method(args));
   }


   @Test
   void <method>_notFound_returns404_handlesGracefully() {
       // Stub WireMock to return 404 Not Found
       stubFor(get(urlPathEqualTo("/expected/path"))
           .willReturn(notFound()));
       // Assert client returns empty/null OR throws NotFoundException — depends on client implementation
   }


   @Test
   void <method>_unauthorized_returns401_handlesOrThrows() {
       // Only generate if the client sends auth tokens/headers
       stubFor(get(urlPathEqualTo("/expected/path"))
           .willReturn(unauthorized()));
       // Assert client throws AuthenticationException or triggers re-auth
   }


   @Test
   void <method>_emptyResponseBody_handlesGracefully() {
       // Stub WireMock to return 200 with empty body
       stubFor(get(urlPathEqualTo("/expected/path"))
           .willReturn(ok().withBody("")));
       // Assert client returns null/empty object — NOT a deserialization exception
   }


   @Test
   void <method>_malformedJson_throwsDeserializationException() {
       // Stub WireMock to return 200 with invalid JSON
       stubFor(get(urlPathEqualTo("/expected/path"))
           .willReturn(ok().withBody("{{not-json}}")));
       // Assert client throws deserialization or mapping exception
   }


   @Test
   void <method>_verifiesRequestHeadersAndBody() {
       // Stub WireMock to return success
       stubFor(get(urlPathEqualTo("/expected/path"))
           .willReturn(okJson("{...}")));
       client.method(args);
       // WireMock verify: assert correct Authorization header, Content-Type, and request body sent
       wireMockServer.verify(getRequestedFor(urlPathEqualTo("/expected/path"))
           .withHeader("Content-Type", equalTo("application/json"))
           .withHeader("Authorization", matching("Bearer .*")));
   }
}
```


Rules for client tests:
- Use WireMock to simulate the external service
- Read the actual client code to determine exact URLs, HTTP methods, headers, and request/response shapes
- Test success, 4xx, 5xx, timeout, and network error scenarios
- For GraphQL clients: stub the GraphQL endpoint and verify query/mutation payloads
- For AWS SDK clients (Athena, S3, STS): use @MockBean on the AWS SDK client beans — WireMock cannot simulate AWS auth
- Test retry behavior if the client has retry logic
- Test request/response mapping (verify deserialization is correct)
- ALWAYS test 400 (bad request) and 404 (not found) responses — these are the most common real-world error codes
- Test 401 response only if the client sends authentication headers (OAuth token, API key, etc.)
- Test empty response body (200 with no content) — verify no deserialization crash
- Test malformed JSON response — verify the client throws a meaningful exception, not a raw Jackson error
- Verify outbound request correctness: use WireMock verify() to assert the client sends correct
  headers (Authorization, Content-Type) and request body. This catches serialization bugs.
- Conditional generation: 401 tests are only generated if the client code sets auth headers.
  Malformed JSON tests are always generated. Request verification tests are always generated.


### 3.6 Event-Driven Integration Tests


For EACH Kafka producer/consumer or EventBus component found to be MISSING coverage in Phase 1.5:


**Pattern for Producers:**


```java
@SpringBootTest(properties = {"spring.profiles.active=integration-test,mock"})
@ActiveProfiles({"integration-test", "mock"})
class <ProducerName>IntegrationTest {


   @MockBean
   private <EventBusOrKafkaTemplate> eventBus;


   @Autowired
   private <ProducerClass> producer;


   @Test
   void publish_sendsEventWithCorrectPayload() {
       producer.publish(testEvent);
       verify(eventBus).send(argThat(event ->
           event.getTopic().equals("expected-topic") &&
           event.getPayload().contains("expected-field")
       ));
   }


   @Test
   void publish_whenEventBusFails_handlesGracefully() {
       doThrow(new RuntimeException("EventBus down"))
           .when(eventBus).send(any());
       // Verify error handling — does it retry? log? throw?
   }


   @Test
   void publish_withNullPayload_throwsOrSkips() {
       // Pass null event to producer
       // Assert: either throws IllegalArgumentException or gracefully skips (depends on implementation)
   }


   @Test
   void publish_verifiesCorrectHeadersAndMetadata() {
       // Call producer with valid event
       // Verify event metadata: topic, partition key, headers, timestamp
       producer.publish(testEvent);
       verify(eventBus).send(argThat(event ->
           event.getHeaders().containsKey("correlation-id") &&
           event.getTimestamp() != null
       ));
   }
}
```


**Pattern for Consumers/Listeners:**


```java
class <ConsumerName>IntegrationTest {


   @Autowired
   private <ConsumerClass> consumer;


   @MockBean
   private <DownstreamService> service;


   @Test
   void onMessage_validPayload_processesSuccessfully() {
       var message = buildTestMessage("valid-payload");
       consumer.onMessage(message);
       verify(service).process(argThat(arg -> /* validate */));
   }


   @Test
   void onMessage_invalidPayload_doesNotCrash() {
       var message = buildTestMessage("malformed");
       assertDoesNotThrow(() -> consumer.onMessage(message));
   }


   @Test
   void onMessage_duplicateMessage_isIdempotent() {
       // Only generate if consumer has deduplication logic
       // Send same message twice
       // Verify downstream service is called only once (or call is idempotent)
       var message = buildTestMessage("valid-payload");
       consumer.onMessage(message);
       consumer.onMessage(message);
       verify(service, times(1)).process(any());
   }


   @Test
   void onMessage_nullPayload_doesNotCrash() {
       // Send message with null body
       // Assert no exception thrown — consumer should log and skip
       assertDoesNotThrow(() -> consumer.onMessage(null));
   }


   @Test
   void onMessage_whenDownstreamFails_doesNotAcknowledge() {
       // Only generate if consumer has manual ack/nack or retry logic
       // Mock downstream service to throw exception
       // Verify message is NOT acknowledged (or is sent to DLQ)
       var message = buildTestMessage("valid-payload");
       doThrow(new RuntimeException("downstream failure")).when(service).process(any());
       assertThrows(RuntimeException.class, () -> consumer.onMessage(message));
   }
}
```


### 3.7 End-to-End Flow Tests


For each major business flow that spans controller → service → persistence → external client,
write one end-to-end test only if ALL layers in that flow are either newly generated or already covered:


```java
class <FlowName>EndToEndIntegrationTest extends IntegrationTestBase {
   @MockBean
   private <DaoClass> dao;


   @MockBean
   private <ExternalHttpClient> httpClient;


   @Test
   void completeFlow_fromRequestToPersistence() {
       // 1. Stub DAO and external services
       when(dao.findById(any())).thenReturn(Optional.of(TestDataBuilder.buildEntity()));
       stubFor(get(urlPathEqualTo("/external/path")).willReturn(okJson("{...}")));


       // 2. Send HTTP request to controller endpoint
       // 3. Assert HTTP response
       // 4. Verify DAO save was called with correct data
       verify(dao).save(argThat(entity -> entity.getStatus().equals("PROCESSED")));
       // 5. Verify external service was called (WireMock verify)
   }


   @Test
   void completeFlow_invalidInput_failsAtController() {
       // Send request with invalid input to the entry-point controller endpoint
       // Assert 400 response
       // Verify error does NOT propagate to DAO or external service
       verify(dao, never()).save(any());
   }


   @Test
   void completeFlow_daoFailure_returns500() {
       // Stub external services to succeed, but DAO to throw DataAccessException
       when(dao.save(any())).thenThrow(new DataAccessException("DB error") {});
       stubFor(get(urlPathEqualTo("/external/path")).willReturn(okJson("{...}")));


       // Send valid HTTP request
       // Assert 500 response
       // Verify: external service may or may not have been called (depends on orchestration order)
   }


   @Test
   void completeFlow_externalServiceDown_degradesGracefully() {
       // Stub DAO to succeed, but external service to return 500 or timeout
       when(dao.findById(any())).thenReturn(Optional.of(TestDataBuilder.buildEntity()));
       stubFor(get(urlPathEqualTo("/external/path")).willReturn(serverError()));


       // Send valid HTTP request
       // Assert: either 500 with meaningful error, or degraded response (depends on resilience pattern)
   }
}
```


### 3.8 Test Data Builder


Generate a `TestDataBuilder.java` utility that provides factory methods for every domain object and entity:


```java
public final class TestDataBuilder {
   public static <EntityType> build<EntityType>() {
       return <EntityType>.builder()
           .field1("test-value-1")
           .field2("test-value-2")
           // ... all required fields with sensible defaults
           .build();
   }
   // One method per entity/DTO/domain object
}
```


Rules:
- Read each entity/DTO class to determine all fields, required vs optional, builder pattern
- Use realistic but obviously-test values (e.g., "test-datasource-id", "test-arn")
- For enums, default to the first value
- For timestamps, use Instant.now() or a fixed test instant


---


## Phase 4: Test Quality Checklist


Before finalizing, verify each test class against this checklist:


- [ ] Compiles: All imports resolve, no missing dependencies
- [ ] Annotations correct: @SpringBootTest, @ActiveProfiles, @MockBean used appropriately
- [ ] DAOs mocked: All DAO/Repository dependencies in service tests are @MockBean — not wired real
- [ ] DAO verify calls present: verify(dao) assertions confirm correct persistence interactions
- [ ] No hardcoded ports: Uses @LocalServerPort or port = 0
- [ ] No TLS in tests: Test profile disables SSL
- [ ] Descriptive names: Test method names follow `<method>_<condition>_<expected>` pattern
- [ ] Assertions meaningful: Not just assertNotNull — assert specific field values
- [ ] Side effects verified: verify() calls for DAO saves, external calls, event publishes
- [ ] Negative cases covered: Invalid input, missing resources, DAO failures, service failures
- [ ] No test interdependence: Each test can run independently
- [ ] Clean state: Tests don't leak state between runs
- [ ] Gap coverage: Every class identified as MISSING in Phase 1.5 now has a generated test
- [ ] Null inputs tested: Every public service method has a null-input test
- [ ] Empty results tested: List/search endpoints return 200 with [] on empty results
- [ ] DAO negative paths: findById-nonExistent, duplicate key (if unique constraints exist), null required fields
- [ ] Client error codes: 400, 404, empty body, malformed JSON tested for every external client
- [ ] Event idempotency: Duplicate message handling tested for consumers (if deduplication logic exists)
- [ ] End-to-end negative: At least one negative E2E flow per major business flow
- [ ] Conditional tests justified: 401/403/409/cache/idempotency tests only generated when annotations/logic warrant them


---


## Phase 5: Verification and Coverage Reporting


### 5.1 Compile Check


```bash
cd <project-root> && ./mvnw compile -pl app -q && ./mvnw test-compile -pl app -q
```


Fix any compilation errors before proceeding. Do not report completion if this step fails.


### 5.2 Run Integration Tests


```bash
./mvnw verify -pl app \
 -Dspring.profiles.active=integration-test,mock \
 -Dtest=none \
 -DfailIfNoTests=false \
 -Dit.test="*IntegrationTest"
```


Fix any runtime errors or startup failures before proceeding.


### 5.3 Generate and Display Test Coverage Report


After all tests pass, generate the merged JaCoCo coverage report:


```bash
./mvnw jacoco:report -pl app
```


Then read and parse the JaCoCo XML report to extract coverage metrics:


```bash
cat app/target/site/jacoco-merged/jacoco.xml | grep -E '<counter type="'
cat app/target/site/jacoco-merged/jacoco.csv
```


Display the coverage report in this format:


```
╔══════════════════════════════════════════════════════════════════════════════╗
║               Integration Test Coverage Report                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Layer             │ Classes │ Methods │ Lines   │ Branches │ Coverage %    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Controllers       │   4/4   │  18/20  │  95/110 │  20/28   │  86%          ║
║  Services          │   3/5   │  12/22  │  80/130 │  15/40   │  61%          ║
║  DAOs/Repositories │   2/2   │   8/8   │  40/40  │   8/10   │  95%          ║
║  Clients           │   1/1   │   4/4   │  22/22  │   6/8    │  96%          ║
║  Event Components  │   1/1   │   2/2   │  10/10  │   2/2    │ 100%          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  TOTAL             │  11/13  │  44/56  │ 247/312 │  51/88   │  79%          ║
╚══════════════════════════════════════════════════════════════════════════════╝


Newly Generated Tests
─────────────────────────────────────────────────────────────────────────
✅ PaymentServiceIntegrationTest         → 4 test methods  ✅ all passed
✅ UserRepositoryIntegrationTest         → 4 test methods  ✅ all passed
✅ OrderControllerIntegrationTest        → 5 test methods  ✅ all passed
✅ PaymentProducerIntegrationTest        → 2 test methods  ✅ all passed
─────────────────────────────────────────────────────────────────────────
Total new test classes : 4
Total new test methods : 15
Layers now fully covered: Controllers, DAOs/Repositories, Clients, Events


Pre-existing Tests (unchanged)
─────────────────────────────────────────────────────────────────────────
✅ UserServiceIntegrationTest            → 3 test methods  ✅ all passed
✅ AuditDaoIntegrationTest               → 4 test methods  ✅ all passed
✅ NotificationClientIntegrationTest     → 4 test methods  ✅ all passed
─────────────────────────────────────────────────────────────────────────


Coverage Gap Remaining (not in scope of this run)
─────────────────────────────────────────────────────────────────────────
⚠️  PaymentService (2 methods below 60% branch coverage)
  → Consider adding edge case tests for payment retry logic
─────────────────────────────────────────────────────────────────────────


Full HTML report: app/target/site/jacoco-merged/index.html
```


Rules for coverage reporting:
- Always display coverage broken down by layer (Controllers, Services, DAOs, Clients, Events)
- Highlight any layer still below 80% coverage and suggest what might be missing
- Clearly separate newly generated tests from pre-existing tests
- If JaCoCo XML is not available, fall back to parsing the CSV report
- If neither is available, report test pass/fail results only and note that the JaCoCo plugin may need to be added manually
- Always display the path to the full HTML report so the developer can open it in a browser


---


## Important Notes


- Do not delete or modify existing tests. The integration package is additive.
- Gap detection is mandatory — never skip Phase 1.5 even if the integration package already exists.
- Match the project's existing code style: indentation, naming conventions, import ordering.
- Use the project's existing Lombok/MapStruct patterns — if entities use @Builder, use builders in tests.
- Respect the hexagonal architecture: test through ports, not by reaching into internal implementation.
- ALWAYS @MockBean DAOs and Repositories in service-layer tests. Service tests exercise business
 logic — persistence behavior is tested separately in dedicated persistence tests (section 3.4).
- If the project uses a proprietary persistence SDK (like IDP), mock at the SDK boundary rather
 than trying to spin up the actual data platform.
- For Intuit-specific SDKs (IXP, EventBus, IDPS, offline tickets): always mock these in integration tests.
- For AWS SDK clients (Athena, S3, STS): use @MockBean to replace the SDK client beans.
- Select WireMock version based on the Spring Boot version detected in Phase 1.1 — do not hardcode 3.3.1 for all projects.


---


## Intuit Infrastructure Bypass Configuration


When generating integration tests for any Intuit Spring Boot repo, the following configuration
is required to bypass Intuit-internal SDK initialization that fails outside of MSAAS/AWS environments.


### Application Test Profile (`application-integration-test.yml`)


Always include these properties in the integration test profile:


```yaml
spring:
 main:
   allow-bean-definition-overriding: true
   lazy-initialization: true
 cloud:
   bootstrap:
     enabled: false


jsk:
 spring:
   config:
     idps:
       connection:
         enabled: false
       listener:
         initialize:
           context: false
 lastmile:
   enabled: false


security:
 intuit:
   additional-ignored: /**
   iamTicketFlowEnabled: false
   authZFlowEnabled: false
   enabled: false


authz:
 config:
   connectingEnvironment: E2E
   enabled: false


server:
 port: 0
 ssl:
   enabled: false


management:
 server:
   port: 0
   ssl:
     enabled: false
```


### @SpringBootTest Properties


Always include these properties in the `@SpringBootTest` annotation (or base test class):


```java
@SpringBootTest(
   webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
   properties = {
     "spring.profiles.active=integration-test,mock",
     "spring.cloud.bootstrap.enabled=false",
     "jsk.spring.config.idps.connection.enabled=false",
     "jsk.spring.config.idps.listener.initialize.context=false",
     "security.intuit.authZFlowEnabled=false",
     "security.intuit.iamTicketFlowEnabled=false",
     "security.intuit.additional-ignored=/**",
     "jsk.lastmile.enabled=false",
     "spring.autoconfigure.exclude=com.intuit.platform.jsk.security.iam.autoconfig.servlet.IntuitSecurityAutoConfiguration",
     "kafka.dataClassificationConsumerEnabled=false",
     "kafka.dmConsumerEnabled=false",
     "kafka.assessmentStatusConsumerEnabled=false",
     "kafka.assessmentStatusProducerEnabled=false"
   })
```


Note: Kafka property names are project-specific. Scan for `@ConditionalOnProperty` on Kafka
consumer/producer classes and disable them all via properties rather than mocking the full Kafka infrastructure.


### IntegrationTestConfig Mock Beans


The `IntegrationTestConfig` class MUST provide `@Bean @Primary` mocks for the following
Intuit infrastructure beans (if the project depends on them):


| Bean | Package | Why |
|------|---------|-----|
| `IntuitSecurityProperties` | `com.intuit.platform.jsk.security.iam.autoconfig` | JSK security framework requires appId/appSecret |
| `AuthZHandler` | `com.intuit.identity.authz.spring.sdk.handler` | AuthZ SDK connects to authorization service at startup |
| `AuthZDecisionVoter` | `com.intuit.identity.authz.spring.sdk.config` | Required by MethodSecurityConfig |
| `OfflineTicketClient` | Project-specific package | Service-to-service auth via offline tickets |
| `OfflineTicketProperties` | Project-specific package | Configuration for offline ticket client |
| `PdgAggregatorFeatureFlagClient` (or equivalent IXP client) | Project-specific | IXP SDK connects to experimentation service |
| `Configuration` (IDP) | `com.intuit.platform.idp.persistence` | IDP persistence SDK; stub `getEntityDao()`, `getBulkEntityDao()`, `getRelationDao()`, `getBulkRelationDao()` with `Mockito.doReturn(mock(RestEntityDao.class))` |
| `EventBusClient` | `com.intuit.data.eventbus` | EventBus SDK client |
| `EventBusClientFactory` | Project-specific | Factory for EventBus clients |
| `KafkaTemplate` | `org.springframework.kafka.core` | Kafka producer template |
| All DAO classes | Project-specific `*.daos.*` package | IDP-based DAOs that depend on the Configuration bean |
| All external HTTP clients | Project-specific `*.client.*` packages | WebClient/RestTemplate-based clients that connect to external services |


### SecurityFilterChain Override


To permit all HTTP requests in tests (bypasses JSK security filters), add this bean to `IntegrationTestConfig`:


```java
@Bean
@Primary
public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
   http.csrf(csrf -> csrf.disable())
       .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
   return http.build();
}
```


### IDP Configuration Mock Pattern


When the project uses IDP persistence SDK, the `Configuration` mock must return typed DAO instances:


```java
@Bean
@Primary
@SuppressWarnings("unchecked")
public Configuration idpConfiguration() {
   Configuration config = Mockito.mock(Configuration.class);
   Mockito.doReturn(Mockito.mock(RestEntityDao.class)).when(config).getEntityDao();
   Mockito.doReturn(Mockito.mock(RestBulkEntityDao.class)).when(config).getBulkEntityDao();
   Mockito.doReturn(Mockito.mock(RestRelationshipDao.class)).when(config).getRelationDao();
   Mockito.doReturn(Mockito.mock(RestBulkRelationshipDao.class)).when(config).getBulkRelationDao();
   return config;
}
```


Use `Mockito.doReturn()` (not `when().thenReturn()`) to avoid generic type mismatch errors
with the IDP SDK's `RestEntityDao<BaseEntity>` return types.


### AuthZ ConnectingEnvironment Valid Values


The `authz.config.connectingEnvironment` property MUST be one of: `PROD`, `E2E`, `PRF`, `QAL`.
Using any other value (like `TEST` or `LOCAL`) will cause `IllegalArgumentException: No enum constant`.


### WireMock Compatibility


Do NOT use `@AutoConfigureWireMock` from `spring-cloud-contract-wiremock` when the project uses
`wiremock-standalone` version 3.x+. The `spring-cloud-contract-wiremock` library internally calls
`new ResponseTemplateTransformer(boolean)` which was removed in WireMock 3.x.


Instead, use programmatic WireMock:


```java
@ExtendWith(MockitoExtension.class)
class ClientIntegrationTest {
   private static WireMockServer wireMockServer;


   @BeforeAll
   static void startWireMock() {
       wireMockServer = new WireMockServer(WireMockConfiguration.wireMockConfig().dynamicPort());
       wireMockServer.start();
   }


   @AfterAll
   static void stopWireMock() {
       wireMockServer.stop();
   }
}
```


### Maven Command to Run Integration Tests Locally


```bash
mvn test -pl app \
 -Dtest="<base-package>.integration.**" \
 -DfailIfNoTests=false \
 -Djsk.spring.config.idps.listener.initialize.context=false \
 -Djsk.spring.config.idps.connection.enabled=false \
 -Dspring.cloud.bootstrap.enabled=false \
 -Dcheckstyle.skip=true \
 -Dpmd.skip=true \
 -Dspotbugs.skip=true \
 -Djacoco.skip=true
```


### Common Pitfalls


1. **`spring.profiles.active` in profile-specific YAML**: Spring Boot rejects `spring.profiles.active`
  inside `application-<profile>.yml`. Set it only in `@SpringBootTest(properties=...)` or `@ActiveProfiles`.


2. **`@MockBean` import**: In Spring Boot 3.2.x, `@MockBean` is at `org.springframework.boot.test.mock.mockito.MockBean`
  (not `org.springframework.boot.test.mock.bean.MockBean`). Check the actual jar before importing.


3. **Request validation in API tests**: Always read the DTO's `@NotNull`, `@Min`, `@Max` constraints
  and ensure test request bodies satisfy them. Use `List` types where the DTO declares `List<String>`.


4. **Kafka consumers with `@ConditionalOnProperty`**: If you enable a consumer for testing, its
  `KafkaConsumerConfig` will also activate and try to create a real `ConsumerFactory`. Either:
  - Test consumers in isolation (without Spring context) using direct instantiation + `@Mock`
  - Or mock the `ConsumerFactory` and `ConcurrentKafkaListenerContainerFactory` beans


5. **`@EnableAutoConfiguration(exclude=...)` vs `spring.autoconfigure.exclude`**: Only actual
  auto-configuration classes (registered via `AutoConfiguration.imports` or `spring.factories`)
  can be excluded. Bootstrap configurations and `@Configuration` classes cannot — use
  `@ComponentScan(excludeFilters=...)` or `@Primary` bean overrides instead.


---


## Test Pattern Fixes


### Request Validation in API Tests (400 BAD_REQUEST Prevention)


Before writing any API test request body, ALWAYS read the target DTO class and check:
- `@NotNull` fields — must be present in the JSON body
- `@NotBlank` fields — must be present and non-empty
- `@Min` / `@Max` on numeric fields — test values must be within range
- `List<T>` fields — must be JSON arrays `[...]`, not plain strings


**Pattern — read DTO then build request:**


```java
// WRONG: rollupName is List<String> but sending a plain string
String requestBody = "{\"page\":1,\"size\":10,\"rollup_name\":\"DevX\"}";  // → 400


// CORRECT: use JSON array for List fields, satisfy @Min constraints
String requestBody = "{\"page\":1,\"size\":10,\"rollup_name\":[\"DevX\"]}";  // → 200
```


**Pattern — handle @NotNull fields:**


```java
// WRONG: missing @NotNull field 'is_pi_element'
String requestBody = "{\"from_page\":0,\"to_page\":1,\"size\":10}";  // → 400


// CORRECT: include all @NotNull fields
String requestBody = "{\"from_page\":0,\"to_page\":1,\"size\":10,\"is_pi_element\":true}";  // → 200
```


Also check `@JsonNaming` on the DTO:
- `SnakeCaseStrategy` → use `snake_case` keys in JSON (`rollup_name`, `is_pi_element`)
- `UpperCamelCaseStrategy` → use `PascalCase` keys in JSON (`FindingCount`, `SearchFindings`)


### DAO Mock Stubbing Pattern (Null Return Prevention)


When DAOs are provided as `@Primary @Bean` mocks in `IntegrationTestConfig`, calling any method
on them returns `null` by default (Mockito default). Tests that verify DAO behavior must set up
stubs explicitly.


**WRONG — calling mocked DAO without stubbing:**


```java
@Autowired private AssessmentDao assessmentDao;  // This is a Mockito mock from IntegrationTestConfig


@Test
void create_callsDao() {
   Assessment assessment = buildAssessment();
   AssessmentEntity result = assessmentDao.create(assessment);
   assertThat(result).isNotNull();  // FAILS: result is null because mock returns null by default
}
```


**CORRECT — stub the mock before calling:**


```java
@Autowired private AssessmentDao assessmentDao;  // This is a Mockito mock from IntegrationTestConfig


@Test
void create_callsDao() {
   Assessment assessment = buildAssessment();
   AssessmentEntity mockEntity = new AssessmentEntity();
   mockEntity.setAssessmentRequestId("test-req-123");


   when(assessmentDao.create(any(Assessment.class))).thenReturn(mockEntity);


   AssessmentEntity result = assessmentDao.create(assessment);


   assertThat(result).isNotNull();
   assertThat(result.getAssessmentRequestId()).isEqualTo("test-req-123");
   verify(assessmentDao).create(any(Assessment.class));
}
```


**Key rule**: When a DAO/Repository is provided as a mock bean, the test verifies
that the correct DAO methods are called with correct arguments (interaction testing),
NOT that the DAO returns real data from a database.


For `Optional`-returning methods:


```java
// Stub "not found" scenario
when(assessmentDao.findByAssessmentId("non-existent")).thenReturn(Optional.empty());


// Stub "found" scenario
when(assessmentDao.findByAssessmentId("existing-id")).thenReturn(Optional.of(mockEntity));
```


### Mockito Strict Stubbing (UnnecessaryStubbingException Prevention)


When using `@ExtendWith(MockitoExtension.class)` (default in JUnit 5 + Mockito), Mockito
enforces strict stubbing — any `when()` stub set up in `@BeforeEach` that isn't used in
a particular test method will throw `UnnecessaryStubbingException`.


**When this happens**: Tests with shared `@BeforeEach` setup where different test methods
use different subsets of the stubs (common in client integration tests with WireMock).


**Fix — add lenient strictness:**


```java
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClientIntegrationTest {


   @Mock private SomeDependency dependency;


   @BeforeEach
   void setUp() {
       // These stubs are shared across all tests but not all tests use every stub
       when(dependency.getToken()).thenReturn("test-token");
       when(dependency.getConfig()).thenReturn(mockConfig);
   }


   @Test
   void testA() {
       // Only uses getToken(), not getConfig() — without LENIENT this would fail
   }
}
```


**When NOT to use LENIENT**: If every test method uses all the stubs from `@BeforeEach`,
keep strict mode (the default) — it helps catch dead code and stale test setup.


**Alternative — use `lenient()` per-stub** (when only one or two stubs are conditionally used):


```java
@BeforeEach
void setUp() {
   lenient().when(dependency.getToken()).thenReturn("test-token");  // Only this one is lenient
   when(dependency.getConfig()).thenReturn(mockConfig);  // This stays strict
}
```


---


## Additional Failure Modes and Fixes


These are common failure patterns encountered across Intuit Spring Boot repositories.
Check for each during Phase 5 verification and apply the corresponding fix.


### 1. Circular Dependency on Context Load


**Symptom**: `BeanCurrentlyInCreationException: Error creating bean ... Requested bean is currently in creation`


**When**: Repos with mutual `@Autowired` between services, or `@Lazy`-annotated beans that
form a cycle when all are eagerly initialized in tests.


**Fix**: Add to test properties:
```java
"spring.main.allow-circular-references=true"
```
Or mock one side of the cycle in `IntegrationTestConfig`.


### 2. `@Value` Properties Missing


**Symptom**: `IllegalArgumentException: Could not resolve placeholder 'some.property'`


**When**: Beans use `@Value("${some.property}")` for properties not defined in the
integration test profile (often secrets, feature flags, or environment-specific URLs).


**Fix**: During Phase 1.4 (Read Configuration), scan ALL `@Value` annotations in source files:
```bash
grep -rn "@Value" app/src/main/java --include="*.java" | grep -v "test"
```
Ensure every referenced property has a value in `application-integration-test.yml`.
For secrets (`{secret}idps:/...`), replace with plain test values since IDPS is disabled.


### 3. Scheduled Tasks Firing During Tests


**Symptom**: Tests pass but `NullPointerException` in background threads from `@Scheduled` methods,
or unexpected mock interactions from cron jobs running mid-test.


**When**: Repos with `@Scheduled` cron jobs or `@EnableScheduling` that trigger immediately
or on short intervals.


**Fix**: Disable scheduling in test properties:
```yaml
spring:
 task:
   scheduling:
     pool:
       size: 0
```
Or add to `@SpringBootTest` properties:
```java
"spring.task.scheduling.pool.size=0"
```
For Spring Boot 3.2+, also consider:
```java
"spring.threads.virtual.enabled=false"
```


### 4. WebClient Base URL Unresolved (`${wiremock.server.port}`)


**Symptom**: `IllegalArgumentException: Could not resolve placeholder 'wiremock.server.port'`


**When**: `application-integration-test.yml` references `${wiremock.server.port}` but WireMock
isn't started via `@AutoConfigureWireMock` (e.g., when using programmatic WireMock or for tests
that don't use WireMock at all).


**Fix**: Do NOT use `${wiremock.server.port}` in the test YAML. Instead:
- Use a fixed placeholder URL: `http://localhost:0` (won't be called because client is mocked)
- Or inject the WireMock port programmatically in `@BeforeEach` via `@DynamicPropertySource`:
```java
@DynamicPropertySource
static void configureProperties(DynamicPropertyRegistry registry) {
   registry.add("acp.baseUrl", () -> "http://localhost:" + wireMockServer.port());
}
```


### 5. Jackson Deserialization / Assertion Mismatch


**Symptom**: `assertThat(response.getBody()).contains("fieldName")` fails because
the JSON uses a different naming strategy.


**When**: Response DTOs use `@JsonNaming(UpperCamelCaseStrategy)` but test asserts
against `camelCase` or `snake_case` field names.


**Fix**: Always check `@JsonNaming` on the response DTO:
- `SnakeCaseStrategy` → assert against `snake_case` keys: `"assessment_id"`, `"created_date"`
- `UpperCamelCaseStrategy` → assert against `PascalCase` keys: `"FindingCount"`, `"WriteDuration"`
- No `@JsonNaming` → assert against `camelCase` keys (Jackson default): `"assessmentId"`


### 6. `@Async` Methods Return Null


**Symptom**: `NullPointerException` when calling `.get()` on a `CompletableFuture` returned
by an `@Async` service method, or mocked async methods returning null.


**When**: Service methods annotated with `@Async` that return `CompletableFuture<T>`.
In test contexts, the async executor may not be fully initialized.


**Fix options**:
1. Disable async in tests:
```java
"spring.task.execution.pool.core-size=0"
```
2. When mocking an `@Async` service, return a completed future:
```java
when(asyncService.processAsync(any()))
   .thenReturn(CompletableFuture.completedFuture(expectedResult));
```
3. For real async testing, use `Awaitility`:
```java
await().atMost(5, SECONDS).untilAsserted(() ->
   verify(dao).save(argThat(entity -> entity.getStatus().equals("PROCESSED")))
);
```


### 7. MapStruct Mapper Beans Not Found


**Symptom**: `NoSuchBeanDefinitionException: No qualifying bean of type 'XyzMapper'`


**When**: Project uses MapStruct with `componentModel = "spring"` but the annotation processor
hasn't generated implementation classes during the test-compile phase (e.g., when skipping compile
via `-Dopenapi.generator.maven.plugin.skip=true`).


**Fix**: Ensure `mvn compile` (or at minimum `mvn process-classes`) runs BEFORE `test-compile`.
MapStruct generates `XyzMapperImpl.java` during annotation processing in the compile phase.
If the compile phase is skipped or cached, mapper implementations won't exist.


Alternatively, mock the mapper in tests:
```java
@Bean
@Primary
public AssessmentMapper assessmentMapper() {
   return Mockito.mock(AssessmentMapper.class);
}
```


### 8. `@ConditionalOnProperty` Beans Missing


**Symptom**: `NoSuchBeanDefinitionException` for a bean that exists in production profiles
but not in the test profile.


**When**: A service depends on a bean guarded by `@ConditionalOnProperty(name="feature.x.enabled", havingValue="true")`
and the test profile doesn't set that property (defaults to false/missing).


**Fix**: During Phase 1.2, scan for ALL `@ConditionalOnProperty` annotations:
```bash
grep -rn "@ConditionalOnProperty" app/src/main/java --include="*.java"
```
For each:
- If the bean IS needed by tests: add the property to the test profile with value `true`
- If the bean is NOT needed: ensure nothing in the test dependency chain requires it
- If unclear: mock the conditional bean in `IntegrationTestConfig`


### 9. `TestRestTemplate` Redirect Behavior


**Symptom**: Test expects `301`/`302` but gets `200` (because `TestRestTemplate` follows redirects),
or test expects response from endpoint A but gets response from endpoint B (the redirect target).


**When**: Controllers return `ResponseEntity.status(HttpStatus.FOUND).location(uri).build()`.


**Fix**: When testing redirect behavior, use `RestTemplate` with redirects disabled:
```java
@Test
void endpoint_redirects() {
   HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
   factory.setHttpClient(HttpClientBuilder.create().disableRedirectHandling().build());
   RestTemplate noRedirectTemplate = new RestTemplate(factory);


   ResponseEntity<String> response = noRedirectTemplate.getForEntity(url, String.class);
   assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FOUND);
   assertThat(response.getHeaders().getLocation()).hasPath("/expected/redirect");
}
```


### 10. Port Conflicts in Parallel Test Execution


**Symptom**: `java.net.BindException: Address already in use` or flaky tests that
occasionally interfere with each other.


**When**: Surefire runs tests in parallel (`<forkCount>4</forkCount>`) and multiple
`@SpringBootTest(RANDOM_PORT)` contexts start simultaneously, or WireMock servers
use hardcoded ports.


**Fix**:
- Always use `server.port=0` and `management.server.port=0` (already in our base config)
- For WireMock: always use `.dynamicPort()`, NEVER hardcode port numbers
- If tests share a Spring context (same `@SpringBootTest` properties + `@MockBean` set),
 Spring caches and reuses the context — this is fine and expected
- If tests use DIFFERENT `@MockBean` sets, they get separate contexts — ensure each
 uses `port=0` to avoid conflicts
- For surefire parallel execution, set `reuseForks=true` and avoid `static` mutable state


### 11. `@TestConfiguration` Not Picked Up


**Symptom**: Beans defined in `IntegrationTestConfig` don't override the real beans.
The real (broken) bean still initializes.


**When**: The test class doesn't have `@Import(IntegrationTestConfig.class)` and the
`@TestConfiguration` is not in the same package or a nested class.


**Fix**: Always explicitly `@Import(IntegrationTestConfig.class)` in the base test class.
Spring Boot does NOT auto-discover `@TestConfiguration` classes — they must be explicitly imported.
If using a base class with `@Import`, subclasses inherit it automatically.


### 12. Tomcat / Embedded Server SSL Keystore Not Found


**Symptom**: `FileNotFoundException: /app/tmp/keystore.pkcs12 (No such file or directory)`
or `SSLException` during test startup.


**When**: The main `application.yml` configures TLS with `server.ssl.key-store=/app/tmp/keystore.pkcs12`
which doesn't exist on the developer's machine.


**Fix**: Already handled by setting `server.ssl.enabled=false` in the integration test profile.
Verify this is present — if missing, the embedded Tomcat will try to load the keystore and fail.


### 13. `@Profile("!test")` Exclusion Not Working


**Symptom**: Beans annotated with `@Profile("!test")` still load during integration tests,
causing unwanted side effects (real HTTP calls, real Kafka connections, etc.).


**When**: The test uses `@ActiveProfiles("integration-test")` but production beans are
guarded with `@Profile("!test")` — checking for a profile literally named `"test"`, not
`"integration-test"`. Since the active profile is `integration-test` (not `test`), the
`!test` condition evaluates to `true` and the bean loads.


**Fix**: Add BOTH profiles to `@ActiveProfiles` so that `@Profile("!test")` exclusions work:


```java
@ActiveProfiles({"integration-test", "mock", "test"})
```


Or in `@SpringBootTest` properties:
```java
"spring.profiles.active=integration-test,mock,test"
```


This ensures:
- `@Profile("!test")` → bean is EXCLUDED (profile "test" is active)
- `@Profile("test")` → bean IS INCLUDED
- `@Profile("integration-test")` → bean IS INCLUDED
- `application-integration-test.yml` → still loaded (based on "integration-test" profile)


**Important**: Adding the `"test"` profile does NOT load `application-test.yml` unless that
file exists. It only affects `@Profile` annotation evaluation on beans.


**Alternative** (if adding `"test"` profile causes other issues): Change the production
bean's annotation to check the integration-test profile as well:
```java
@Profile("!test & !integration-test")  // Excluded in both test profiles
```
But this requires modifying production code — prefer adding the `"test"` profile to
`@ActiveProfiles` instead.
