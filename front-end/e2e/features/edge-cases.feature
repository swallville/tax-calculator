Feature: Edge Cases
  As a developer
  I want to verify the calculator handles unusual inputs and failures gracefully
  So that users never see crashes, NaN values, or broken UI

  Background:
    Given I am on the tax calculator page

  Scenario Outline: Invalid salary input shows validation error
    When I enter "<salary>" as my annual income
    And I select "2022" as the tax year
    And I click the calculate button
    Then I should see a salary validation error

    Examples:
      | salary     |
      | abc        |
      | -5000      |
      | !@#%       |

  Scenario Outline: API error codes show appropriate error state
    Given the API returns a <status> error
    When I enter "100000" as my annual income
    And I select "2022" as the tax year
    And I click the calculate button
    Then I should see the error state with "<title>"

    Examples:
      | status | title              |
      | 404    | Year Not Supported |
      | 500    | Calculation Failed |
      | 503    | Calculation Failed |

  Scenario: Error state clears after successful retry
    Given the API returns a 500 error
    When I enter "100000" as my annual income
    And I select "2022" as the tax year
    And I click the calculate button
    Then I should see the error state with "Calculation Failed"
    When I click the retry button
    Then I should see either results or an error

  Scenario: Very large salary does not produce NaN or Infinity
    When I enter "$999,999,999" as my annual income
    And I select "2022" as the tax year
    And I click the calculate button
    Then I should see the tax breakdown
    And the page should not contain "NaN"
    And the page should not contain "Infinity"
