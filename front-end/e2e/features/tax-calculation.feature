Feature: Tax Calculation
  As a Canadian taxpayer
  I want to calculate my federal income tax
  So that I can understand my tax obligations

  Background:
    Given I am on the tax calculator page

  Scenario: Empty state on initial load
    Then I should see the empty state message
    And I should not see the tax breakdown

  Scenario Outline: Calculate tax for various salaries
    When I enter "<salary>" as my annual income
    And I select "<year>" as the tax year
    And I click the calculate button
    Then I should see the tax breakdown with <brackets> bracket rows
    And I should see the effective tax rate

    Examples:
      | salary  | year | brackets |
      | 50000   | 2022 | 5        |
      | 100000  | 2022 | 5        |
      | 100000  | 2021 | 5        |
      | 100000  | 2020 | 5        |
      | 100000  | 2019 | 5        |

  Scenario: Form validation rejects empty salary
    When I click the calculate button without entering a salary
    Then I should see a salary validation error

  Scenario Outline: API error displays correct error state
    Given the API returns a <status> error
    When I enter "100000" as my annual income
    And I select "2022" as the tax year
    And I click the calculate button
    Then I should see the error state with "<title>"
    And the retry button should be <retry_visible>

    Examples:
      | status | title              | retry_visible |
      | 500    | Calculation Failed | visible       |
      | 404    | Year Not Supported | hidden        |

  Scenario: Retry after server error
    Given the API returns a 500 error
    When I enter "100000" as my annual income
    And I select "2022" as the tax year
    And I click the calculate button
    Then I should see the error state with "Calculation Failed"
    When I click the retry button
    Then I should see either results or an error

  Scenario Outline: Tax year selection changes available brackets
    When I enter "100000" as my annual income
    And I select "<year>" as the tax year
    And I click the calculate button
    Then I should see the tax breakdown

    Examples:
      | year |
      | 2022 |
      | 2021 |
      | 2020 |
      | 2019 |
